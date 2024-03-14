/* Given the metadata folder, this will spin out the search records to index as a JSON output.
Once this is done, run the combine-jsons.js to combine the jsons within the output folder into 
a single combined JSON to upload to search indexing.
 */
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const crypto = require("crypto");

const metadataDir = path.join(
  __dirname,
  "metadata_mci_formatted_with_correct_categories_statutes_adv_csv_fixed"
);

// Helper function to process and transform the file URL
function transformFileURL(url) {
  return url.replace("storage-uat", "storage");
}

function hashRecord(record) {
  const recordString = JSON.stringify(record);
  return crypto.createHash("sha256").update(recordString).digest("hex");
}

function processDirectory(
  directory,
  gazetteCategory = null,
  subCategory = null
) {
  fs.readdir(directory, { withFileTypes: true }, (err, entries) => {
    if (err) {
      console.error(`Error reading directory ${directory}:`, err);
      return;
    }

    let isTopLevel = directory === metadataDir;

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        const newCategory = isTopLevel ? entry.name : gazetteCategory;
        const newSubCategory = isTopLevel ? null : entry.name;
        processDirectory(fullPath, newCategory, newSubCategory);
      } else if (entry.isFile() && path.extname(entry.name) === ".csv") {
        processCSV(fullPath, gazetteCategory, subCategory);
      }
    }
  });
}

function createJsonLogFilePath(filePath, suffix) {
  const logsDir = path.join(__dirname, suffix);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  const logFileName = `${path.basename(filePath, ".csv")}.json`;
  return path.join(logsDir, logFileName);
}

function writeToJsonFile(logFilePath, data) {
  fs.writeFileSync(logFilePath, JSON.stringify(data, null, 2));
}

function logError(logFilePath, row, error) {
  const errorLogDir = path.join(__dirname, "errors");
  if (!fs.existsSync(errorLogDir)) {
    fs.mkdirSync(errorLogDir, { recursive: true });
  }
  fs.appendFileSync(
    logFilePath,
    JSON.stringify({ row, error: error.message }) + "\n"
  );
}

function processCSV(filePath, category, subCategory) {
  const suffix = subCategory ? `${category}/${subCategory}` : `${category}`;
  const logFilePath = createJsonLogFilePath(filePath, `egazettes/${suffix}`);
  const errorLogFilePath = createJsonLogFilePath(filePath, `errors/${suffix}`);
  const results = [];
  let lineCount = 0; // Counter for lines processed

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => {
      lineCount++;
      try {
        const notificationNum = row.Notification_No;
        const fileUrl = transformFileURL(
          new URL(row.Subject.match(/href="([^"]*)/)[1]).toString()
        );
        // console.log(`Reading subject`, row.Subject);
        const title = row.Subject.match(/>(.*?)<\/a>/s)[1]; // retrieve the title from the Subject's href between the <a> and </a> tags
        const publishDate = row.Published_Date; // Assuming the date is already in the correct format

        const rawEntry = {
          notificationNum,
          title,
          category,
          subCategory,
          fileUrl,
          publishDate,
          publishTimestamp: new Date(publishDate).getTime(),
        };

        const logEntry = { objectID: hashRecord(rawEntry), ...rawEntry };

        results.push(logEntry);
      } catch (error) {
        console.log(`Error: `, error);
        logError(errorLogFilePath, row, error);
      }
    })
    .on("end", () => {
      if (results.length !== lineCount) {
        console.error(
          `Mismatch in line count and results length for file: ${filePath}`
        );
      }
      writeToJsonFile(logFilePath, results);
      // console.log(
      //   `CSV file ${filePath} processing complete. JSON written to ${logFilePath}`
      // );
    })
    .on("error", (error) => {
      console.log(`Error: `, error);
      logError(errorLogFilePath, {}, error);
    });
}

// Start processing from the metadata directory
processDirectory(metadataDir);

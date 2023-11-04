const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const metadataDir = path.join(__dirname, "metadata_test");

// Helper function to process and transform the file URL
function transformFileURL(url) {
  return url.replace("storage-uat", "storage");
}

// Helper function to extract the notification number from the filename
function extractNotificationNumber(href) {
  const filename = href.split("filename=")[1];
  return filename.split(".")[0];
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
    fs.mkdirSync(logsDir);
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
    fs.mkdirSync(errorLogDir);
  }
  fs.appendFileSync(
    logFilePath,
    JSON.stringify({ row, error: error.message }) + "\n"
  );
}

function processCSV(filePath, category, subCategory) {
  const logFilePath = createJsonLogFilePath(filePath, "logs");
  const errorLogFilePath = createJsonLogFilePath(filePath, "errors");
  const results = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => {
      try {
        const notificationNum =
          row.Notification_No || extractNotificationNumber(row.Subject);
        const fileUrl = transformFileURL(
          new URL(row.Subject.match(/href="([^"]*)/)[1]).toString()
        );
        console.log(`Reading subject`, row.Subject);
        const title = row.Subject.match(/>(.*?)<\/a>/s)[1];
        const publishDate = row.Published_Date; // Assuming the date is already in the correct format

        const logEntry = {
          objectID: "",
          notificationNum,
          title,
          category,
          subCategory,
          fileUrl,
          publishDate,
          publishTimestamp: new Date(publishDate).getTime(),
        };

        if (subCategory) {
          logEntry.objectID = `${category}-${subCategory}-${notificationNum}`;
        } else {
          logEntry.objectID = `${category}-${notificationNum}`;
        }

        results.push(logEntry);
      } catch (error) {
        console.log(`Error: `, error);
        logError(errorLogFilePath, row, error);
      }
    })
    .on("end", () => {
      writeToJsonFile(logFilePath, results);
      console.log(
        `CSV file ${filePath} processing complete. JSON written to ${logFilePath}`
      );
    })
    .on("error", (error) => {
      console.log(`Error: `, error);
      logError(errorLogFilePath, {}, error);
    });
}

// Start processing from the metadata directory
processDirectory(metadataDir);

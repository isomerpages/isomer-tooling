const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { format } = require("date-fns");
const createCsvWriter = require("fast-csv").writeToPath;
const fastCsv = require("fast-csv");

const metadataDir = path.join(__dirname, "metadata");

// Helper function to process and transform the file URL
function transformFileURL(url) {
  return url.replace("storage-uat", "storage");
}

// Helper function to extract the notification number from the filename
function extractNotificationNumber(href) {
  const filename = href.split("filename=")[1];
  return filename.split(".")[0];
}

// Recursive function to process directories and files
function processDirectory(directory, gazetteCategory, gazetteSubCategory = "") {
  fs.readdir(directory, { withFileTypes: true }, (err, entries) => {
    if (err) {
      console.error(`Error reading directory ${directory}:`, err);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      console.log("Full-Path", fullPath);
      if (entry.isDirectory()) {
        // If entry is a directory, recurse into it
        processDirectory(fullPath, gazetteCategory, entry.name);
      } else if (entry.isFile() && path.extname(entry.name) === ".csv") {
        // If entry is a CSV file, process it
        processCSV(fullPath, gazetteCategory, gazetteSubCategory);
      }
    }
  });
}

// Define createCsvLogger function to set up the CSV logger
function createCsvLogger(filePath, headers) {
  const ws = fs.createWriteStream(filePath);
  return fastCsv.format({ headers, writeHeaders: true }).pipe(ws);
}

function processCSV(filePath, gazetteCategory, gazetteSubCategory) {
  const results = [];
  const logFileName = `${path.basename(filePath, ".csv")}_log.csv`;
  const csvLogStream = createCsvLogger(logFileName, [
    "row",
    "status",
    "message",
  ]);

  fs.createReadStream(filePath)
    .pipe(fastCsv.parse({ headers: true }))
    .on("data", (row) => {
      try {
        const gazetteNotificationNumber =
          row.Notification_No || extractNotificationNumber(row.Subject);
        const fileURL = transformFileURL(
          new URL(row.Subject.match(/href="([^"]*)/)[1]).toString()
        );
        const gazetteTitle = row.Subject.match(/>(.*?)<\/a>/)[1];
        const publishDate = row.Published_Date; // Assuming the date is already in the correct format

        // Add your processed data to the results array
        results.push({
          gazetteCategory,
          gazetteSubCategory,
          gazetteNotificationNumber,
          gazetteTitle,
          publishDate,
          fileURL,
        });

        // Log the success for this row
        csvLogStream.write({
          row: gazetteNotificationNumber,
          status: "success",
          message: "Processed successfully",
        });
      } catch (error) {
        // Log any errors for this row
        csvLogStream.write({
          row: row.Notification_No || "N/A",
          status: "error",
          message: error.message,
        });
      }
    })
    .on("end", () => {
      csvLogStream.end(); // Ensure to close the write stream
      // At this point, you have a 'results' array filled with processed data
      // You can now do further processing with the results array
      console.log("CSV file processing complete.");
    })
    .on("error", (error) => {
      console.error("An error occurred while processing the CSV file:", error);
    });
}
// Start processing from the metadata directory
processDirectory(metadataDir, path.basename(metadataDir));

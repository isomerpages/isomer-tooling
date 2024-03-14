/** Validates the given CSV's notification number to ensure no weird chars.
 * Allows alphanumeric, dot and whitespace in regex.
 * Regex can be modified to validate other patterns.
 *
 * Given a path, it recursively finds and validates CSVs within this path.
 * */
const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

const targetDirectory = "./metadata"; // Replace with the directory you want to search
const errorLogFile = "./errors.log";

// Function to recursively find CSV files
function findCsvFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findCsvFiles(filePath, fileList);
    } else if (path.extname(filePath) === ".csv") {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Function to check rows and log errors

function processCsvFile(filePath) {
  const fileContent = fs.readFileSync(filePath, "utf8");
  Papa.parse(fileContent, {
    header: true,
    step: function (row) {
      const notificationNo = row.data["Notification_No"];
      // Allow alphanumeric characters, dot (.), and space
      if (notificationNo && !/^[a-zA-Z0-9. ]+$/.test(notificationNo)) {
        fs.appendFileSync(
          errorLogFile,
          `Error in file ${filePath}: ${JSON.stringify(row.data)}\n`
        );
      }
    },
    complete: function () {
      console.log(`Processed ${filePath}`);
    },
  });
}

// Main process
const csvFiles = findCsvFiles(targetDirectory);
csvFiles.forEach((file) => {
  processCsvFile(file);
});

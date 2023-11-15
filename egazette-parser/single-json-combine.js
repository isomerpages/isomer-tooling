/**
 * Given a directory, recursively find all JSON files titled "combined.json" and create
 * a master JSON called "all_combined.json"
 */
const fs = require("fs");
const path = require("path");

const targetDirectory = "./egazettes/Government Gazette"; // Replace with the directory you want to search
const outputFile = "./egazettes/Government Gazette/all_combined.json";

// Function to recursively find 'combined.json' files
function findCombinedJsonFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findCombinedJsonFiles(filePath, fileList);
    } else if (path.basename(filePath) === "combined.json") {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Function to merge JSON data from multiple files
function mergeJsonFiles(files) {
  let mergedData = [];

  files.forEach((file) => {
    let rawData = fs.readFileSync(file);
    let jsonData = JSON.parse(rawData);
    mergedData.push(jsonData);
  });

  return mergedData;
}

// Main process
try {
  const combinedFiles = findCombinedJsonFiles(targetDirectory);

  if (combinedFiles.length === 0) {
    console.log("No 'combined.json' files found.");
    return;
  }

  let mergedData = mergeJsonFiles(combinedFiles);

  fs.writeFileSync(outputFile, JSON.stringify(mergedData, null, 2));
  console.log(`Merged data written to ${outputFile}`);
} catch (error) {
  console.error("An error occurred:", error);
}

/**
 * Given a starting directory, this script recursively combines all the JSON files
 * within this directory into a single JSON.
 */
const fs = require("fs");
const path = require("path");

// Recursive function to combine JSON files in each directory
function combineJsonFilesInDirectory(directoryPath) {
  // Read the directory contents
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

  // Initialize an array to hold the combined JSON data
  let combinedJsonData = [];

  // Iterate over the directory entries
  for (const entry of entries) {
    // Construct the full path of the entry
    const fullPath = path.join(directoryPath, entry.name);

    // If the entry is a directory, recurse into it
    if (entry.isDirectory()) {
      combineJsonFilesInDirectory(fullPath);
    } else if (path.extname(entry.name).toLowerCase() === ".json") {
      // If the entry is a JSON file, read and parse it
      const fileContent = fs.readFileSync(fullPath, "utf8");
      const jsonData = JSON.parse(fileContent);
      // Combine the JSON data
      combinedJsonData = combinedJsonData.concat(jsonData);
    }
  }

  // If we have JSON data to write, write the combined JSON to a new file in the current directory
  if (combinedJsonData.length > 0) {
    const combinedJsonFilePath = path.join(directoryPath, "combined.json");
    fs.writeFileSync(
      combinedJsonFilePath,
      JSON.stringify(combinedJsonData, null, 2),
      "utf8"
    );
    console.log("Combined JSON saved to:", combinedJsonFilePath);
  }
}

// Starting directory for combining JSON files
const startingDirectory = path.join(__dirname, "egazettes");

// Start the recursive JSON combining process
combineJsonFilesInDirectory(startingDirectory);

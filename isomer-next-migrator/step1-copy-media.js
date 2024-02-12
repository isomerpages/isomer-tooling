const fs = require("fs-extra");
const path = require("path");

// Define base source and destination paths
const basePathSource = path.join("");
const basePathDestination = path.join("");

// Construct specific paths using the base paths
const sourceImagesPath = path.join(basePathSource, "images");
const sourceFilesPath = path.join(basePathSource, "files");
const destImagesPath = path.join(basePathDestination, "public", "images");
const destFilesPath = path.join(basePathDestination, "public", "files");

// Function to copy directories
async function copyDirectories() {
  try {
    // Copy the images directory
    await fs.copy(sourceImagesPath, destImagesPath);
    console.log("Images folder copied successfully to " + destImagesPath);

    // Copy the files directory
    await fs.copy(sourceFilesPath, destFilesPath);
    console.log("Files folder copied successfully to " + destFilesPath);
  } catch (err) {
    console.error("Error copying directories:", err);
  }
}

module.exports = { copyDirectories };

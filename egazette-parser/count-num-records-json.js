/**
 * Counts the number of objects within a JSON file assuming the file contains a large JSON array
 */
const fs = require("fs");
const path = require("path");

const inputFile = "./2023-gazettes/combined.json"; // Replace with the path to your JSON file

// Function to read JSON from file
function readJsonFromFile(filePath) {
  try {
    const rawData = fs.readFileSync(filePath);
    return JSON.parse(rawData);
  } catch (error) {
    console.error("Error reading or parsing file:", error);
    return null;
  }
}

// Main process
const data = readJsonFromFile(inputFile);

if (data) {
  if (Array.isArray(data)) {
    console.log(`Number of records: ${data.length}`);
  } else {
    console.log("The JSON does not contain an array.");
  }
} else {
  console.log("Failed to read or parse JSON file.");
}

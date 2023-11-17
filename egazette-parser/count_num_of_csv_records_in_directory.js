const fs = require("fs");
const path = require("path");
const util = require("util");

const directoryPath = "./metadata_mci";
const outputFilePath = "./metadata_mci/tally.json";

const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);
const readdirAsync = util.promisify(fs.readdir);

async function processFiles() {
  try {
    const files = await readdirAsync(directoryPath);
    const csvFiles = files.filter((file) => path.extname(file) === ".csv");

    let results = {};
    let totalRecords = 0;

    for (let file of csvFiles) {
      const data = await readFileAsync(path.join(directoryPath, file), "utf8");
      const numRecords = data.trim().split("\n").length - 1;
      results[file] = numRecords;
      totalRecords += numRecords;
    }

    const outputData = {
      totalRecords,
      fileTallies: results,
    };

    await writeFileAsync(outputFilePath, JSON.stringify(outputData, null, 2));
    console.log("Tally written to", outputFilePath);
  } catch (err) {
    console.error("Error:", err);
  }
}

processFiles();

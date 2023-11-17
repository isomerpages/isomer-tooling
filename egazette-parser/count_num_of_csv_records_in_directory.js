const fs = require("fs");
const path = require("path");
const util = require("util");

const directoryPath =
  "./metadata_mci_formatted_with_correct_categories_statutes_adv_csv_fixed";
const outputFilePath =
  "./metadata_mci_formatted_with_correct_categories_statutes_adv_csv_fixed/tally.json";

const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);
const readdirAsync = util.promisify(fs.readdir);
const statAsync = util.promisify(fs.stat);

async function countCsvRecords(filePath) {
  const data = await readFileAsync(filePath, "utf8");
  return data.trim().split("\n").length - 1; // remove the header row from the count
}

async function processDirectory(dirPath) {
  const entries = await readdirAsync(dirPath);
  let totalRecords = 0;
  const fileTallies = {};

  for (let entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stats = await statAsync(fullPath);

    if (stats.isDirectory()) {
      const { total, tallies } = await processDirectory(fullPath);
      totalRecords += total;
      Object.assign(fileTallies, tallies);
    } else if (path.extname(entry) === ".csv") {
      const numRecords = await countCsvRecords(fullPath);
      fileTallies[entry] = numRecords;
      totalRecords += numRecords;
    }
  }

  return { total: totalRecords, tallies: fileTallies };
}

async function processFiles() {
  try {
    const { total, tallies } = await processDirectory(directoryPath);

    const outputData = {
      totalRecords: total,
      fileTallies: tallies,
    };

    await writeFileAsync(outputFilePath, JSON.stringify(outputData, null, 2));
    console.log("Tally written to", outputFilePath);
  } catch (err) {
    console.error("Error:", err);
  }
}

processFiles();

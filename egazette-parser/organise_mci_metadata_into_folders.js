const fs = require("fs");
const path = require("path");
const util = require("util");

const directoryPath = "./metadata_mci_with_correct_categories"; // Replace with your input directory path
const outputPath = "./metadata_mci_formatted_with_correct_categories"; // Replace with your desired output directory path

const categories = [
  "Acts Supplement",
  "Industrial Relations Supplement",
  "Trade Marks Supplement",
  "Treaties Supplement",
  "Bills Supplement",
  "Acts Supplement",
  "Statutes",
  "Subsidiary Legislation Supplement",
  "Revised Subsidiary Legislation",
  "Government Gazette Supplement",
];

const subcategoriesOfGovernmentGazette = [
  "Advertisements",
  "Appointments",
  "Audited Reports",
  "Cessation of Service",
  "Corrigendum",
  "Death",
  "Dismissals",
  "Leave",
  "Bankruptcy Act Notices",
  "Companies Act Notices",
  "Notices under the Constitution",
  "Notices under other Acts",
  "Others",
  "Revocation",
  "Tenders",
  "Termination of Service",
  "Vacation of Service",
];

const mkdirAsync = util.promisify(fs.mkdir);
const readdirAsync = util.promisify(fs.readdir);
const copyFileAsync = util.promisify(fs.copyFile);

async function createDirectoryIfNotExist(dir) {
  if (!fs.existsSync(dir)) {
    await mkdirAsync(dir, { recursive: true });
  }
}

async function findTargetPath(file) {
  const fileNamePart = file.split("_")[0];

  // Check if the file name corresponds directly to any category
  if (categories.includes(fileNamePart)) {
    const categoryPath = path.join(outputPath, fileNamePart);
    await createDirectoryIfNotExist(categoryPath);
    return categoryPath;
  }

  // Check if the file belongs to a sub-category of "Government Gazette"
  if (subcategoriesOfGovernmentGazette.includes(fileNamePart)) {
    const subCategoryPath = path.join(
      outputPath,
      "Government Gazette",
      fileNamePart
    );
    await createDirectoryIfNotExist(subCategoryPath);
    return subCategoryPath;
  }

  // Fallback to a generic 'Uncategorized' directory
  const uncategorizedPath = path.join(outputPath, "Uncategorized");
  await createDirectoryIfNotExist(uncategorizedPath);
  return uncategorizedPath;
}

async function organizeFiles() {
  try {
    const files = await readdirAsync(directoryPath);
    const csvFiles = files.filter((file) => path.extname(file) === ".csv");

    for (let file of csvFiles) {
      const targetPath = await findTargetPath(file);

      // Copy the file to the new location
      const newFilePath = path.join(targetPath, file);
      await copyFileAsync(path.join(directoryPath, file), newFilePath);
    }

    console.log("Files organized successfully");
  } catch (err) {
    console.error("Error:", err);
  }
}

organizeFiles();

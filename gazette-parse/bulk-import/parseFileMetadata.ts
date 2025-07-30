import * as fs from "fs";

import { csvFileMapping, subCategoryMapping } from "./mapping";
import { Category } from "./constants";

type CsvFileMetadata = {
  fileName: string;
  year: string;
  category: string;
  subCategory: string;
  title: string;
  notificationNumber?: string;
  folderName: string;
  publishDate: Date;
};

interface ParseFileMetadataProps {
	csvFileName: string;
	metadataRootFolder: string;
}

export const parseFileMetadata = async ({
	csvFileName,
	metadataRootFolder,
}: ParseFileMetadataProps): Promise<CsvFileMetadata[]> => {
	const csvFileData = csvFileMapping[csvFileName];
	if (!csvFileData) throw new Error(`File ${csvFileName} not found in csvFileMapping`);

	const isGovernmentGazette = csvFileData.category === Category.GovernmentGazette;
	const results: CsvFileMetadata[] = [];

	const data = fs.readFileSync(`${metadataRootFolder}/${csvFileName}`, {
		encoding: "utf8",
	});

	const rows: string[] = data.split("\n").map(
		(value) => value.replace(/^\uFEFF/, "") // remove BOM included in the files
	);

	for (const row of rows) {
		const rowData = row.split(",");

		// Note, we are assuming the CSV file has the following columns in a certain order
		// Do double confirm with the CSV file before running this script
		const year = rowData[0];
		const notificationNumber = rowData[1];
		const fileName = rowData[2];
		const publishDate = new Date(rowData[rowData.length - 1]);
		if (!year || !fileName) throw new Error("invalid csv");
	
		if (isGovernmentGazette) {
			const subCategory = subCategoryMapping[rowData[rowData.length - 2]];

			// Joining all columns from index 3 up to (but not including) the third-to-last column,
			// handling cases where the title may contain commas.
			const title = rowData.slice(3, -3).join(",");

			if (!subCategory) {
				console.log(rowData);
				throw new Error("invalid csv, subCategory not retrieved correctly");
			}

			results.push({
				fileName,
				year,
				notificationNumber,
				category: csvFileData.category,
				subCategory,
				title,
				folderName: csvFileData.folderName,
				publishDate,
			});
		} else {
			// Joining all columns from index 4 up to (but not including) the last column,
			// handling cases where the title may contain commas.
			const title = rowData.slice(4, -1).join(",");

			results.push({
				fileName,
				year,
				notificationNumber,
				category: csvFileData.category,
				subCategory: csvFileData.subCategory!,
				title,
				folderName: csvFileData.folderName,
				publishDate,
			});
		}
	}

	return results;
};
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
	csvFileRootFolder: string;
	skipFirstRowHeaders?: boolean;
}

export const parseFileMetadata = async ({
	csvFileName,
	csvFileRootFolder,
	skipFirstRowHeaders = false,
}: ParseFileMetadataProps): Promise<CsvFileMetadata[]> => {
	const csvFileData = csvFileMapping[csvFileName];
	if (!csvFileData) throw new Error(`File ${csvFileName} not found in csvFileMapping`);

	const isGovernmentGazette = csvFileData.category === Category.GovernmentGazette;
	const results: CsvFileMetadata[] = [];

	const data = fs.readFileSync(`${csvFileRootFolder}/${csvFileName}`, {
		encoding: "utf8",
	});

	const rows: string[] = data.split("\n").map(
		(value) => value.replace(/^\uFEFF/, "") // remove BOM included in the files
	);

	for (const row of rows.slice(skipFirstRowHeaders ? 1 : 0)) {
		const rowData = row.split(",");

		// Note, we are assuming the CSV file has the following columns in a certain order
		// Do double confirm with the CSV file before running this script
		const year = rowData[0]; // verified (column A)
		const notificationNumber = rowData[1]; // verified (column B), but some don't have this column -> to clarify
		const fileName = rowData[2];
		const publishDate = new Date(rowData[8]); // verified (column I)
		if (!year || !fileName) throw new Error("invalid csv");
	
		if (isGovernmentGazette) {
			const subCategory = subCategoryMapping[rowData[7]]; // verified (column H)

			// Joining all columns from index 3 up to (but not including) the third-to-last column,
			// handling cases where the title may contain commas.
			const title = rowData[3]; // verified (column D)

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
			const title = rowData[3]; // verified (column D)

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
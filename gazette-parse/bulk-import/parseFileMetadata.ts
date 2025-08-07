import * as fs from "fs";

import { csvFileMapping, metadataColumnMapping, subCategoryMapping } from "./mapping";
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
		const year = rowData[metadataColumnMapping.Year];
		const notificationNumber = rowData[metadataColumnMapping.NotificationNumber];
		const fileName = rowData[metadataColumnMapping.FileName];
		const title = rowData[metadataColumnMapping.Title];
		const publishDate = new Date(
			rowData[metadataColumnMapping.PublishDate]
		);
		if (!year || !fileName) throw new Error("invalid csv");
	
		if (isGovernmentGazette) {
			const subCategory = subCategoryMapping[
				rowData[metadataColumnMapping.SubCategory]
			];
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
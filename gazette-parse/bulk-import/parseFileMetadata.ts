import * as fs from "fs";
import csv from "csv-parser";
import { fixMojibake } from "./fixMojibake";

import { csvFileMapping, metadataColumnMapping, subCategoryMapping } from "./mapping";
import { Category } from "./constants";

export type CsvFileMetadata = {
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

	// Parse CSV file
	const rows = await parseCsvFile({
		filePath: `${csvFileRootFolder}/${csvFileName}`,
		skipFirstRowHeaders,
	});
	
	// Process each row
	// Using column indices as defined in metadataColumnMapping
	for (const row of rows) {
		const year = row[metadataColumnMapping.Year];

		const notificationNumber = row[metadataColumnMapping.NotificationNumber];

		const fileName = `${row[metadataColumnMapping.FileName]}.pdf`;

		const titleWithPossiblyBrokenEncoding = row[metadataColumnMapping.Title];
		const title = fixMojibake(titleWithPossiblyBrokenEncoding);

		const folderName = row[metadataColumnMapping.FolderName];

		const publishDate = new Date(row[metadataColumnMapping.PublishDate]);
		
		if (!year || !fileName) throw new Error("invalid csv");
	
		if (isGovernmentGazette) {
			const subCategory = subCategoryMapping[
				row[metadataColumnMapping.SubCategory]
			];
			if (!subCategory) {
				console.log(row);
				throw new Error("invalid csv, subCategory not retrieved correctly");
			}

			results.push({
				fileName,
				year,
				notificationNumber,
				category: csvFileData.category,
				subCategory,
				title,
				folderName: csvFileData.folderName + "/" + folderName,
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
				folderName: csvFileData.folderName + "/" + folderName,
				publishDate,
			});
		}
	}

	return results;
};

// Helper function to parse CSV using streams
interface ParseCsvFileProps {
	filePath: string;
	skipFirstRowHeaders: boolean;
}
const parseCsvFile = ({ filePath, skipFirstRowHeaders }: ParseCsvFileProps): Promise<any[]> => {
	return new Promise((resolve, reject) => {
		const rows: any[] = [];
		
		fs.createReadStream(filePath)
			.pipe(csv({ headers: false }))
			.on('data', (row: any) => {
				rows.push(row);
			})
			.on('end', () => {
				const dataRows = skipFirstRowHeaders ? rows.slice(1) : rows;
				resolve(dataRows);
			})
			.on('error', (error) => {
				reject(error);
			});
	});
};
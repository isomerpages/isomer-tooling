/**
 * ⚠️  DANGER ZONE - MASS DELETION SCRIPT ⚠️
 * 
 * 🚨  WARNING: This script will PERMANENTLY DELETE records from Algolia!
 * 
 * This tool is designed to bulk delete Algolia records based on CSV file metadata.
 * Once records are deleted, they CANNOT be recovered unless you have backups.
 * 
 * PURPOSE: This script was created for cases where we need to remove records 
 * incorrectly bulk imported into Algolia.
 * 
 * BEFORE RUNNING THIS SCRIPT:
 * 1. ✅  Double-check the CSV_FILE_PATH and CSV_FILE_ROOT_FOLDER variables
 * 2. ✅  Review the fileMetadata to ensure you're deleting the correct records
 * 3. ✅  Test on a staging environment first
 * 4. ✅  Ensure you have the correct ALGOLIA_APP_ID, ALGOLIA_API_KEY, and ALGOLIA_INDEX_NAME
 * 
 * USE AT YOUR OWN RISK - THERE IS NO UNDO BUTTON!
 * 
 * If you're unsure, STOP and consult has someone else eyeball and shadow this before proceeding.
 */

import * as fs from "fs";

import { parseFileMetadata } from './parseFileMetadata';
import { getObjectKey } from '../utils/getObjectKey';
import { getAlgoliaObjectIds } from '../utils/getAlgoliaObjectIds';
import { deleteAlgoliaRecords } from '../utils/deleteAlgoliaRecords';

const { ALGOLIA_APP_ID, ALGOLIA_API_KEY, ALGOLIA_INDEX_NAME } = process.env;

if (!ALGOLIA_APP_ID || !ALGOLIA_API_KEY || !ALGOLIA_INDEX_NAME) {
  throw new Error('Missing env vars');
}

// file of CSV file we want to parse
const CSV_FILE_PATH = "2025-07-recovered-gazettes-gg-gg.csv";

// folder where the csv files are stored
// Relative to the root of where the npm script is run
const CSV_FILE_ROOT_FOLDER = "./bulk-import/csv-files";

const customLog = (message: string) => {
  console.log(message);

  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  fs.appendFileSync("massDeleteAlgoliaRecords.txt", logMessage + "\n");
}

const main = async () => {
  // Check for required --actual-run flag to prevent accidental execution
  const args = process.argv.slice(2);
  if (!args.includes('--actual-run')) {
    console.error('\n🚨  SAFETY CHECK FAILED 🚨');
    console.error('This script requires the --actual-run flag to execute.');
    console.error('This prevents accidental mass deletion of Algolia records.');
    console.error('');
    console.error('Usage: npm run bulkImport:massDelete -- --actual-run');
    console.error('');
    console.error('⚠️  If you are sure you want to proceed, add the --actual-run flag.');
    process.exit(1);
  }

  const fileMetadata = await parseFileMetadata({
		csvFileName: CSV_FILE_PATH,
		csvFileRootFolder: CSV_FILE_ROOT_FOLDER,
    skipFirstRowHeaders: true,
	});
  customLog(`Found ${fileMetadata.length} files to process`);

  let totalChunksToDelete = 0;

  for (let i = 0; i < fileMetadata.length; i++) {
    const file = fileMetadata[i];

    const objectKey = getObjectKey({
      notificationNumber: file.notificationNumber ?? "",
      fileName: file.fileName,
      year: Number(file.year),
      category: file.category,
      subCategory: file.subCategory,
    })
    customLog(`${i + 1} / ${fileMetadata.length} Processing ${objectKey}`);

    const objectIds = await getAlgoliaObjectIds({
      algoliaAppId: ALGOLIA_APP_ID,
      algoliaApiKey: ALGOLIA_API_KEY,
      algoliaIndexName: ALGOLIA_INDEX_NAME,
      objectKey,
    });
    totalChunksToDelete += objectIds.length;
    customLog(`.......... Found ${objectIds.length} chunks to delete`);

    await deleteAlgoliaRecords({
      algoliaAppId: ALGOLIA_APP_ID,
      algoliaApiKey: ALGOLIA_API_KEY,
      algoliaIndexName: ALGOLIA_INDEX_NAME,
      objectIds,
    });
    customLog(`.......... Deleted ${objectKey}`);
  }

  customLog(`All deletions attempted. Total chunks deleted: ${totalChunksToDelete}`);
}

main();

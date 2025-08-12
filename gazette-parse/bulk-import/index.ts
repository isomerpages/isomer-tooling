// Very rough initial migration script - used for large scale population of records
// Preferentially use the newer helper scripts for uploading to algolia/s3
// Metadata parsing may need to change depending on format of the csv metadata file provided

import * as fs from "fs";
import { addToSearchIndex, initSearchIndex } from "../utils/algolia";
import { uploadBlob } from "../utils/uploadBlob";
import { parseFileMetadata } from "./parseFileMetadata";
import { getObjectKey } from "../utils/getObjectKey";
import { parsePdfAsImageAndExtractText } from "../utils/parsePdfAsImageAndExtractText";
import { checkIfFilePresent } from "./checkIfFilePresent";
import { getGazetteFilepath } from "./getGazetteFilepath";

// ------------------------------------------------------------------------------------
// ---------------- UPDATE THIS VARIABLES AND CONSTANTS BEFORE RUNNING ----------------
// ------------------------------------------------------------------------------------
const {
  AWS_PROFILE,
	EXTERNAL_S3_BUCKET,
	ALGOLIA_APP_ID,
  ALGOLIA_API_KEY,
  ALGOLIA_INDEX_NAME,
} = process.env;

if (
  !AWS_PROFILE ||
	!EXTERNAL_S3_BUCKET ||
	!ALGOLIA_APP_ID ||
	!ALGOLIA_API_KEY ||
	!ALGOLIA_INDEX_NAME
) {
	throw new Error("Missing env vars");
}

// file of CSV file we want to parse
const CSV_FILE_PATH = "2025-07-recovered-gazettes-gg-gg.csv";

// folder where the csv files are stored
// Relative to the root of where the npm script is run
const CSV_FILE_ROOT_FOLDER = "./bulk-import/csv-files";

// folder where the gazettes are stored
const GAZETTE_ROOT_FOLDER = "./bulk-import/gazettes";

// note: change to staging if needed (https://storage.egazette-staging.isomer.gov.sg)
const BASE_STORAGE_URL = "https://assets.egazette.gov.sg";

// Others:
// 1. To also update csvFileMapping (see mapping.ts)
// 2. To also check that subCategoryMapping is correct (see mapping.ts)
// 3. Check that the CSV file has the correct columns in the correct order (see parseFileMetadata.ts)
// -------------------------------------------------------------------------
// ----------------------------- END OF UPDATE -----------------------------
// -------------------------------------------------------------------------


const main = async () => {
  const searchIndex = initSearchIndex({
    algoliaAppId: ALGOLIA_APP_ID,
    algoliaApiKey: ALGOLIA_API_KEY,
    algoliaIndexName: ALGOLIA_INDEX_NAME,
  });

  const fileMetadata = await parseFileMetadata({
		csvFileName: CSV_FILE_PATH,
		csvFileRootFolder: CSV_FILE_ROOT_FOLDER,
    skipFirstRowHeaders: true,
	});

  console.log(`Found ${fileMetadata.length} files to process`);

  // Ensure all files are present before processing
  for (const file of fileMetadata) {
    const filePath = getGazetteFilepath({
      folderName: GAZETTE_ROOT_FOLDER,
      file,
    });
    const isFilePresent = await checkIfFilePresent(filePath);
    if (!isFilePresent) {
      throw new Error(`File ${filePath} not found`);
    }
  }

  for (const file of fileMetadata) {
    const filePath = getGazetteFilepath({
      folderName: GAZETTE_ROOT_FOLDER,
      file,
    });

    try {
      const objectKey = getObjectKey({
        notificationNumber: file.notificationNumber ?? "",
        fileName: file.fileName,
        year: Number(file.year),
        category: file.category,
        subCategory: file.subCategory,
      });

      const data = await fs.promises.readFile(filePath.trim());

      console.log("Uploading blob", objectKey);
      await uploadBlob({
        awsProfile: AWS_PROFILE,
        bucketName: EXTERNAL_S3_BUCKET,
        key: objectKey,
        fileBuffer: data,
        isPdf: file.fileName.includes(".pdf"),
      });

      console.log("Parsing file content", filePath);
      const parsedFileContent = await parsePdfAsImageAndExtractText(filePath);
      if (!parsedFileContent) throw new Error("Could not parse file content");

      // upload to algolia
      console.log("Adding to algolia search index", objectKey);
      await addToSearchIndex({
				searchIndex,
        baseStorageUrl: BASE_STORAGE_URL,
        gazetteCategory: file.category,
        gazetteSubCategory: file.subCategory,
        gazetteNotificationNum: file.notificationNumber,
        gazetteTitle: file.title,
        publishDate: file.publishDate,
        objectKey: objectKey,
        content: parsedFileContent,
      });

      console.log("Done processing file", filePath);
    } catch (err) {
      const errMessage = `Error for file ${filePath}: ${JSON.stringify(err.message)}\n`;
      fs.appendFileSync("errors.txt", errMessage);
    }
  }
};

main();

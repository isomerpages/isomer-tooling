// Very rough initial migration script - used for large scale population of records
// Preferentially use the newer helper scripts for uploading to algolia/s3
// Metadata parsing may need to change depending on format of the csv metadata file provided

import * as fs from "fs";
import path from "path";
import { addToSearchIndex } from "./addToSearchIndex";
import { uploadBlob } from "../utils/uploadBlob";
import { parseFileMetadata } from "./parseFileMetadata";
import { getObjectKey } from "../utils/getObjectKey";
import { parsePdfAsImageAndExtractText } from "../utils/parsePdfAsImageAndExtractText";

// ------------------------------------------------------------------------------------
// ---------------- UPDATE THIS VARIABLES AND CONSTANTS BEFORE RUNNING ----------------
// ------------------------------------------------------------------------------------
const {
	AWS_ACCESS_KEY_ID,
	AWS_SECRET_ACCESS_KEY,
	AWS_SESSION_TOKEN,
	EXTERNAL_S3_BUCKET,
	ALGOLIA_APP_ID,
  ALGOLIA_API_KEY,
  ALGOLIA_INDEX_NAME,
	PATH_TO_FILES,
} = process.env;

if (
	!AWS_ACCESS_KEY_ID ||
	!AWS_SECRET_ACCESS_KEY ||
	!AWS_SESSION_TOKEN ||
	!EXTERNAL_S3_BUCKET ||
	!ALGOLIA_APP_ID ||
	!ALGOLIA_API_KEY ||
	!ALGOLIA_INDEX_NAME ||
	!PATH_TO_FILES
) {
	throw new Error("Missing env vars");
}

// file of CSV file we want to parse
const CSV_FILE_PATH = "egazette-sls.2024.csv";

// folder where the metadata files are stored
const METADATA_ROOT_FOLDER = "./metadata-new";

// note: change to staging if needed
const BASE_STORAGE_URL = "https://assets.egazette.gov.sg";

// Others:
// 1. To also update csvFileMapping (see mapping.ts)
// 2. To also check that subCategoryMapping is correct (see mapping.ts)
// 3. Check that the CSV file has the correct columns in the correct order (see parseFileMetadata.ts)
// -------------------------------------------------------------------------
// ----------------------------- END OF UPDATE -----------------------------
// -------------------------------------------------------------------------


const main = async () => {      
  const fileMetadata = await parseFileMetadata({
		csvFileName: CSV_FILE_PATH,
		metadataRootFolder: METADATA_ROOT_FOLDER,
	});

  console.log(`Found ${fileMetadata.length} files to process`);

  for (const file of fileMetadata) {
    const filePath = path.join(
      PATH_TO_FILES,
      file.folderName,
      file.year,
      file.fileName
    );

    try {
      const objectKey = getObjectKey({
        notificationNumber: file.notificationNumber ?? "",
        fileName: file.fileName,
        year: Number(file.year),
        category: file.category,
        subCategory: file.subCategory,
      });

      const data = await fs.promises.readFile(filePath.trim());

      await uploadBlob({
				awsAccessKeyId: AWS_ACCESS_KEY_ID,
				awsSecretAccessKey: AWS_SECRET_ACCESS_KEY,
				awsSessionToken: AWS_SESSION_TOKEN,
        bucketName: EXTERNAL_S3_BUCKET,
        key: objectKey,
        fileBuffer: data,
        isPdf: file.fileName.includes(".pdf"),
      });

      const parsedFileContent = await parsePdfAsImageAndExtractText(filePath);
      if (!parsedFileContent) throw new Error("Could not parse file content");

      // upload to algolia
      await addToSearchIndex({
				algoliaAppId: ALGOLIA_APP_ID,
				algoliaApiKey: ALGOLIA_API_KEY,
				algoliaIndexName: ALGOLIA_INDEX_NAME,
        baseStorageUrl: BASE_STORAGE_URL,
        gazetteCategory: file.category,
        gazetteSubCategory: file.subCategory,
        gazetteNotificationNum: file.notificationNumber,
        gazetteTitle: file.title,
        publishTime: file.publishDate,
        objectKey: objectKey,
        content: parsedFileContent,
      });
    } catch (err) {
      const errMessage = `Error for file ${filePath}: ${JSON.stringify(err.message)}\n`;
      fs.appendFileSync("errors.txt", errMessage);
    }
  }
};

main();

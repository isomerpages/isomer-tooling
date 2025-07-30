import * as fs from "fs";

import path from "path";
import { getObjectKey, parseMetadataCsv } from "./utils";
import { uploadBlob } from "./utils/uploadBlob";

const METADATA_PATH = "./metadata.csv";

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_SESSION_TOKEN,
  EXTERNAL_S3_BUCKET,
} = process.env;

if (
  !AWS_ACCESS_KEY_ID ||
  !AWS_SECRET_ACCESS_KEY ||
  !AWS_SESSION_TOKEN ||
  !EXTERNAL_S3_BUCKET
) {
  throw new Error("Missing env vars");
}

const main = async () => {
  const fileData = await parseMetadataCsv(METADATA_PATH);
  const year = new Date().getFullYear();
  for (const file of fileData) {
    const { filePath, notificationNumber, fileName, category, subCategory } =
      file;

    const objectKey = getObjectKey({
      notificationNumber,
      fileName,
      year,
      category,
      subCategory,
    });

    const data = await fs.promises.readFile(path.resolve(filePath.trim()));

    const isPdfFile = fileName.includes(".pdf");

    await uploadBlob({
      awsAccessKeyId: AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: AWS_SECRET_ACCESS_KEY,
      awsSessionToken: AWS_SESSION_TOKEN,
      bucketName: EXTERNAL_S3_BUCKET,
      key: objectKey,
      fileBuffer: data,
      isPdf: isPdfFile,
    });
  }
};

main();

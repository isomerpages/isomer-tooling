import * as fs from "fs";

import path from "path";
import { parseMetadataCsv } from "./utils";
import { uploadBlob } from "./utils/uploadBlob";
import { getObjectKey } from "./utils/getObjectKey";

const METADATA_PATH = "./metadata.csv";

const { EXTERNAL_S3_BUCKET, AWS_PROFILE } = process.env;

if (!EXTERNAL_S3_BUCKET || !AWS_PROFILE) {
  throw new Error("Missing env var");
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

    await uploadBlob({
      awsProfile: AWS_PROFILE,
      bucketName: EXTERNAL_S3_BUCKET,
      key: objectKey,
      fileBuffer: data,
      isPdf: fileName.includes(".pdf"),
    });
  }
};

main();

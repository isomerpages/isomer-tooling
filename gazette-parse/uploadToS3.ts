import md5 from "md5";
import * as fs from "fs";

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import path from "path";
import { getObjectKey, parseMetadataCsv } from "./utils";

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

const s3Client = new S3Client({
  region: "ap-southeast-1",
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    sessionToken: AWS_SESSION_TOKEN,
  },
});

const uploadBlob = async (
  bucketName: string,
  key: string,
  fileBuffer: Buffer,
  isPdf: boolean
) => {
  try {
    // Set the parameters
    const uploadParams = {
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: isPdf ? "application/pdf" : "text/html",
      ContentDisposition: `inline; filename="${key}"`, // allows browsers to open inline instead of downloading
      ContentMD5: Buffer.from(md5(fileBuffer), "hex").toString("base64"),
    };
    console.log(uploadParams);

    // Upload the file to the bucket
    const data = await s3Client.send(new PutObjectCommand(uploadParams));

    console.info(`Successfully uploaded blob: ${data}`);
    return data; // For example, return the data or promise here if needed
  } catch (err) {
    console.error(`Error when uploading blob: ${JSON.stringify(err)}`);
    throw err; // Rethrow the error for the caller to handle
  }
};

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
    // upload blob to s3
    await uploadBlob(EXTERNAL_S3_BUCKET, objectKey, data, isPdfFile);
  }
};

main();

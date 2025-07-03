// Very rough initial migration script - used for large scale population of records
// Preferentially use the newer helper scripts for uploading to algolia/s3
// Metadata parsing may need to change depending on format of the csv metadata file provided
// Requires the following env vars: ALGOLIA_APP_ID, ALGOLIA_API_KEY, ALGOLIA_INDEX_NAME, EXTERNAL_S3_BUCKET, PATH_TO_FILES

import * as fs from "fs";
import algoliasearch from "algoliasearch";
const { PdfReader } = require("pdfreader");
import md5 from "md5";
import csv from "csv-parser";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Parser } from "htmlparser2";
import path from "path";

const { PDFImage } = require("pdf-image");
const Tesseract = require("tesseract.js");

// Function to convert PDF to high-resolution images
async function parsePdfAsImage(pdfPath: string) {
  const pdfImage = new PDFImage(pdfPath, {
    convertOptions: {
      "-density": "300", // Set the DPI to 300 for better quality
      "-quality": "100",
    },
  });
  const pages = await pdfImage.numberOfPages();
  const imagePaths = [];

  for (let i = 0; i < pages; i++) {
    const imagePath = await pdfImage.convertPage(i);
    imagePaths.push(imagePath);
  }

  const texts = [];

  for (const imagePath of imagePaths) {
    const result = await Tesseract.recognize(imagePath, "eng", {
      // logger: (m: string) => console.log(m), // optional logger to see the OCR process
    });
    texts.push(result.data.text);
  }

  return texts.join(" ");
}

const {
  ALGOLIA_APP_ID,
  ALGOLIA_API_KEY,
  ALGOLIA_INDEX_NAME,
  EXTERNAL_S3_BUCKET,
  PATH_TO_FILES,
} = process.env;

if (
  !ALGOLIA_APP_ID ||
  !ALGOLIA_INDEX_NAME ||
  !ALGOLIA_API_KEY ||
  !EXTERNAL_S3_BUCKET ||
  !PATH_TO_FILES
) {
  throw new Error("Missing env vars");
}

enum Category {
  GovernmentGazette = "Government Gazette",
  LegislativeSupplements = "Legislative Supplements",
  OtherSupplements = "Other Supplements",
}

const csvFileMapping: {
  [string: string]: {
    category: string;
    subCategory?: string;
    folderName: string;
  };
} = {
  "egazette-as.2024.csv": {
    category: Category.LegislativeSupplements,
    subCategory: "Acts Supplement",
    folderName: "as",
  },
  "egazette-bs.2024.csv": {
    category: Category.LegislativeSupplements,
    subCategory: "Bills Supplement",
    folderName: "bs",
  },
  "egazette-irs.2024.csv": {
    category: Category.OtherSupplements,
    subCategory: "Industrial Relations Supplement",
    folderName: "irs",
  },
  "egazette-sgg.2024.csv": {
    category: Category.OtherSupplements,
    subCategory: "Government Gazette Supplement",
    folderName: "sgg",
  },
  "egazette-sl.2024.csv": {
    category: Category.LegislativeSupplements,
    subCategory: "Revised Subsidiary Legislation",
    folderName: "sl",
  },
  "egazette-sls.2024.csv": {
    category: Category.LegislativeSupplements,
    subCategory: "Subsidiary Legislation Supplement",
    folderName: "sls",
  },
  "egazette-statutes.2024.csv": {
    category: Category.LegislativeSupplements,
    subCategory: "Revised Acts",
    folderName: "statutes",
  },
  "egazette-tms.2024.csv": {
    category: Category.OtherSupplements,
    subCategory: "Trade Marks Supplement",
    folderName: "tms",
  },
  "egazette-ts.2024.csv": {
    category: Category.OtherSupplements,
    subCategory: "Treaties Supplement",
    folderName: "ts",
  },
  "egazette-gg.2024.csv": {
    category: Category.GovernmentGazette,
    folderName: "gg",
  },
};

const subCategoryMapping: {
  [string: string]: string;
} = {
  Advertisements: "Advertisements",
  Appointments: "Appointments",
  "Audited Reports": "Audited Reports",
  "Cessation of Service": "Cessation of Service",
  Corrigendum: "Corrigendum",
  Death: "Death",
  Dismissals: "Dismissals",
  Leave: "Leave",
  "Notices under the Bankruptcy Act": "Bankruptcy Act Notice",
  "Notices under the Companies Act": "Companies Act Notice",
  "Notices under the Constitution": "Notices under the Constitution",
  "Notices under various other Acts": "Notices under other Acts",
  Others: "Others",
  Revocation: "Revocation",
  Tenders: "Tenders",
  "Termination of Service": "Termination of Service",
  "Vacation of Service": "Vacation of Service",
};

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
const searchIndex = searchClient.initIndex(ALGOLIA_INDEX_NAME);
const s3Client = new S3Client({
  region: "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});

export const baseStorageUrl = "https://assets.egazette.gov.sg";

interface AddSearchToIndexProps {
  gazetteCategory: string;
  gazetteSubCategory: string;
  gazetteNotificationNum?: string;
  gazetteTitle: string;
  publishTime: Date;
  objectKey: string;
  content: string;
}

function toTimestamp(strDate: string) {
  const datum = new Date(strDate);
  return datum.getTime();
}

function formatObjectId(objectId: string) {
  // Remove apostrophes and whitespaces
  let formattedId = objectId.replace(/['\s]/g, "");

  // If the first character is a dash, remove it
  if (formattedId.startsWith("-")) {
    formattedId = formattedId.substring(1);
  }

  return formattedId;
}

export type GazetteMetadata = {
  title: string;
  category: string;
  subCategory: string;
  notificationNum?: string;
  publishDate: string;
  publishTime: string;
};

export type SearchRecord = Omit<
  GazetteMetadata & {
    objectID: string;
    objectGroup: string;
    publishTimestamp: number;
    fileUrl: string;
    publishYear: number;
    publishMonth: number;
    publishDay: number;
  },
  "publishTime"
>;

const parseFullTextFromHtm = async (htmBuffer: Buffer) => {
  // Read the HTML file
  // const htmlContent = fs.readFileSync('path/to/your/file.htm', 'utf8');

  const htmlContent = htmBuffer.toString();
  let textContent = "";

  const parser = new Parser(
    {
      ontext(text) {
        textContent += text.trim() + " ";
      },
    },
    { decodeEntities: true }
  );

  parser.write(htmlContent);
  parser.end();

  return textContent;
};

const parseFullTextFromPDF = async (pdfBuffer: Buffer) => {
  const data: string[] = await new Promise((resolve, reject) => {
    const parsedData: string[] = [];
    new PdfReader({}).parseBuffer(pdfBuffer, (err: any, item: any) => {
      if (err) {
        reject(err);
      } else if (!item) {
        console.warn("end of buffer");
        resolve(parsedData);
      } else if (item.text) {
        parsedData.push(item.text);
      }
    });
  });

  const parsedText = data.join(" ");
  return parsedText;
};

const chunkContent = (
  parsedText: string,
  objectMetadata: Omit<SearchRecord, "objectID" | "publishTime">
) => {
  const {
    objectGroup,
    title,
    category,
    subCategory,
    notificationNum,
    publishDate,
    publishTimestamp,
    fileUrl,
    publishDay,
    publishMonth,
    publishYear,
  } = objectMetadata;

  const maxSizeInBytes = 7000; // 10kb limit, with buffer
  const regexPattern = new RegExp(`.{1,${maxSizeInBytes}}(?:\\s|$)`, "g");

  const textChunks = [];
  let match;
  while ((match = regexPattern.exec(parsedText)) !== null) {
    textChunks.push(match[0]);
  }
  // Create JSON object with text property
  return textChunks.map((chunk, idx) => ({
    title,
    category,
    subCategory,
    notificationNum,
    publishDate,
    publishTimestamp,
    fileUrl,
    text: chunk,
    objectGroup: objectGroup,
    objectID: `${objectGroup}-text-${idx}`,
    publishDay,
    publishMonth,
    publishYear,
  }));
};

const addToIndex = async (record: SearchRecord) => {
  try {
    await searchIndex.saveObject(record);
  } catch (e) {
    console.error(`Error while adding to index: ${JSON.stringify(e)}`);
  }
};

const addToSearchIndex = async ({
  gazetteCategory,
  gazetteSubCategory,
  gazetteNotificationNum,
  gazetteTitle,
  publishTime,
  objectKey,
  content,
}: AddSearchToIndexProps) => {
  const publishDateStr = publishTime.toLocaleDateString("en-SG");
  const publishTimes = publishDateStr.split("/");

  const newSearchRecord = {
    category: gazetteCategory!,
    subCategory: gazetteSubCategory || "",
    notificationNum: gazetteNotificationNum!,
    title: gazetteTitle!,
    publishDate: publishDateStr,
    publishYear: parseInt(publishTimes[2]!),
    publishMonth: parseInt(publishTimes[1]!),
    publishDay: parseInt(publishTimes[0]!),
    publishTimestamp: publishTime.getTime(),
    fileUrl: new URL(objectKey, baseStorageUrl).href,
    objectGroup: objectKey,
  };

  console.log(`Adding record ${newSearchRecord} to search index`);

  // publish to index
  const records = await chunkContent(content, newSearchRecord);
  try {
    for (const record of records) {
      // console.log(record);
      fs.appendFileSync("fileData.txt", `${JSON.stringify(record)},\n`);
      await addToIndex(record);
    }
  } catch (e) {
    console.error({ message: `Adding to search index failed`, error: e });
    throw e;
  }
};

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

const parseFileMetadata: (
  filePath: string
) => Promise<CsvFileMetadata[]> = async (filePath: string) => {
  const METADATA_ROOT_FOLDER = "./metadata-new";
  const csvFileData = csvFileMapping[filePath];
  if (!csvFileData) throw new Error();
  const isGG = csvFileData.category === Category.GovernmentGazette;
  const results: CsvFileMetadata[] = [];

  const data = fs.readFileSync(`${METADATA_ROOT_FOLDER}/${filePath}`, {
    encoding: "utf8",
  });
  const rows: string[] = data.split("\n").map(
    (value) => value.replace(/^\uFEFF/, "") // remove BOM included in the files
  );
  for (const row of rows) {
    const rowData = row.split(",");
    const year = rowData[0];
    const notificationNumber = rowData[1];
    const fileName = rowData[2];
    const publishDate = new Date(rowData[rowData.length - 1]);
    if (!year || !fileName) throw new Error("invalid csv");
    if (isGG) {
      const subCategory = subCategoryMapping[rowData[rowData.length - 2]];
      const title = rowData.slice(3, -3).join(",");

      if (!subCategory) {
        console.log(rowData);
        throw new Error("invalid csv");
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

  // return new Promise((resolve, reject) => {
  //   fs.createReadStream(`${METADATA_ROOT_FOLDER}/${filePath}`)
  //     .pipe(csv({ headers: false }))
  //     .on("data", (data: Record<number, string>) => {
  //       const rowData: string[] = Object.values(data).map(
  //         (value) => value.replace(/^\uFEFF/, "") // remove BOM included in the files
  //       );
  //       const year = rowData[0];
  //       const notificationNumber = rowData[1];
  //       const fileName = rowData[2];
  //       if (!year || !fileName) throw new Error("invalid csv");
  //       if (isGG) {
  //         const subCategory = subCategoryMapping[rowData[rowData.length - 1]];
  //         const title = rowData.slice(3, -2).join(",");

  //         console.log(rowData);
  //         if (!subCategory) {
  //           console.log(rowData);
  //           throw new Error("invalid csv");
  //         }
  //         results.push({
  //           fileName,
  //           year,
  //           notificationNumber,
  //           category: csvFileData.category,
  //           subCategory,
  //           title,
  //           folderName: csvFileData.folderName,
  //         });
  //       } else {
  //         const title = rowData.slice(4).join(",");
  //         results.push({
  //           fileName,
  //           year,
  //           notificationNumber,
  //           category: csvFileData.category,
  //           subCategory: csvFileData.subCategory!,
  //           title,
  //           folderName: csvFileData.folderName,
  //         });
  //       }
  //     })
  //     .on("end", () => {
  //       resolve(results);
  //     })
  //     .on("error", reject);
  // });
};

const parseFileMetadataDate: (filePath: string) => Promise<
  (Omit<CsvFileMetadata, "subCategory" | "category" | "folderName"> & {
    publishDate: Date;
  })[]
> = async (filePath: string) => {
  const METADATA_ROOT_FOLDER = "./egazette-csv.20240801-v2";
  const results: (Omit<
    CsvFileMetadata,
    "subCategory" | "category" | "folderName"
  > & {
    publishDate: Date;
  })[] = [];

  const data = fs.readFileSync(`${METADATA_ROOT_FOLDER}/${filePath}`, {
    encoding: "utf8",
  });
  const rows: string[] = data.split("\n").map(
    (value) => value.replace(/^\uFEFF/, "") // remove BOM included in the files
  );
  for (const row of rows) {
    const rowData = row.split(",");
    const year = rowData[0];
    const notificationNumber = rowData[1];
    const fileName = rowData[2];
    const title = rowData.slice(4, -1).join(",");
    const publishDate = new Date(rowData[rowData.length - 1]);
    results.push({
      fileName,
      year,
      notificationNumber,
      title,
      publishDate,
    });
  }
  return results;

  // return new Promise((resolve, reject) => {
  //   fs.createReadStream(`${METADATA_ROOT_FOLDER}/${filePath}`)
  //     .pipe(csv({ headers: false }))
  //     .on("data", (data: Record<number, string>) => {
  //       const rowData: string[] = Object.values(data).map(
  //         (value) => value.replace(/^\uFEFF/, "") // remove BOM included in the files
  //       );
  //       const year = rowData[0];
  //       const notificationNumber = rowData[1];
  //       const fileName = rowData[2];
  //       if (!year || !fileName) throw new Error("invalid csv");
  //       if (isGG) {
  //         const subCategory = subCategoryMapping[rowData[rowData.length - 1]];
  //         const title = rowData.slice(3, -2).join(",");

  //         console.log(rowData);
  //         if (!subCategory) {
  //           console.log(rowData);
  //           throw new Error("invalid csv");
  //         }
  //         results.push({
  //           fileName,
  //           year,
  //           notificationNumber,
  //           category: csvFileData.category,
  //           subCategory,
  //           title,
  //           folderName: csvFileData.folderName,
  //         });
  //       } else {
  //         const title = rowData.slice(4).join(",");
  //         results.push({
  //           fileName,
  //           year,
  //           notificationNumber,
  //           category: csvFileData.category,
  //           subCategory: csvFileData.subCategory!,
  //           title,
  //           folderName: csvFileData.folderName,
  //         });
  //       }
  //     })
  //     .on("end", () => {
  //       resolve(results);
  //     })
  //     .on("error", reject);
  // });
};

const main = async () => {
  const csvFiles = Object.keys(csvFileMapping);
  // const fileMetadata: CsvFileMetadata[] = [];
  // for (const csvFile of csvFiles) {
  //   const csvFileData = await parseFileMetadata(csvFile);
  //   fileMetadata.concat(csvFileData);
  // }
  const fileMetadata = await parseFileMetadata("egazette-sls.2024.csv");
  console.log(fileMetadata.length);
  for (const file of fileMetadata) {
    try {
      // read file
      const filePath = path.join(
        process.env.PATH_TO_FILES,
        file.folderName,
        file.year,
        file.fileName
      );
      const fileNumber = file.notificationNumber
        ? file.notificationNumber
        : `${file.fileName.replace(".pdf", "").replace(".htm", "")}`;
      const isPdfFile = file.fileName.includes(".pdf");
      const objectKey = `${file.year}/${file.category}/${
        file.subCategory
      }/${fileNumber}.${isPdfFile ? "pdf" : "htm"}`;
      const data = await fs.promises.readFile(filePath.trim());
      // upload blob to s3
      await uploadBlob(EXTERNAL_S3_BUCKET, objectKey, data, isPdfFile);

      // parse text
      // const parsedFile = isPdfFile
      //   ? await parseFullTextFromPDF(data)
      //   : await parseFullTextFromHtm(data);
      const parsedFile = await parsePdfAsImage(filePath);
      if (!parsedFile) throw new Error("Could not parse file content");
      // upload to algolia
      await addToSearchIndex({
        gazetteCategory: file.category,
        gazetteSubCategory: file.subCategory,
        gazetteNotificationNum: file.notificationNumber,
        gazetteTitle: file.title,
        publishTime: file.publishDate,
        objectKey: objectKey,
        content: parsedFile,
      });
    } catch (err) {
      const errMessage = `Error for file ${path.join(
        process.env.PATH_TO_FILES,
        file.folderName,
        file.year,
        file.fileName
      )}: ${JSON.stringify(err.message)}\n`;
      fs.appendFileSync("errors.txt", errMessage);
    }
  }
};

// const main = async () => {
//   // handle gg differently!
//   // Remember to not do this for sl
//   const FILENAME = "egazette-sl.20240801.csv";
//   const fileMetadata = await parseFileMetadataDate(FILENAME);
//   const data = fs.readFileSync(`fileData-sl-repaired.txt`, {
//     encoding: "utf8",
//   });
//   console.log(fileMetadata.length);
//   const dateMapping: Record<
//     string,
//     {
//       publishDate: string;
//       publishYear: number;
//       publishMonth: number;
//       publishDay: number;
//       publishTimestamp: number;
//     }
//   > = {};
//   for (const file of fileMetadata) {
//     try {
//       const fileNumber =
//         file.notificationNumber && !FILENAME.includes("egazette-sl.")
//           ? file.notificationNumber
//           : `${file.fileName.replace(".pdf", "").replace(".htm", "")}`;
//       const isPdfFile = file.fileName.includes(".pdf");
//       const fileIdentifier = `${file.year}/${fileNumber}.${
//         isPdfFile ? "pdf" : "htm"
//       }`.replace(/ /g, "%20");

//       const publishDateString = new Date(file.publishDate).toLocaleDateString(
//         "en-SG"
//       );
//       const publishTimes = publishDateString.split("/");
//       const newMapping = {
//         publishDate: publishDateString,
//         publishYear: parseInt(publishTimes[2]!),
//         publishMonth: parseInt(publishTimes[1]!),
//         publishDay: parseInt(publishTimes[0]!),
//         publishTimestamp: new Date(file.publishDate).getTime(),
//       };
//       dateMapping[fileIdentifier] = newMapping;
//     } catch (err) {
//       console.log(file.year, file.fileName);
//       const errMessage = `Error for file ${path.join(
//         process.env.PATH_TO_FILES,
//         file.year,
//         file.fileName
//       )}: ${JSON.stringify(err.message)}\n`;
//       fs.appendFileSync("errors-date.txt", errMessage);
//     }
//   }

//   const rows: string[] = data.split("\n");

//   const identifiers = new Set();
//   for (const row of rows) {
//     if (!row) continue;
//     const record = JSON.parse(row.slice(0, -1));
//     const segments = record.fileUrl.split("/");
//     const identifier = `${record.publishYear}/${segments[segments.length - 1]}`;
//     const newFileData = dateMapping[identifier];
//     identifiers.add(identifier);
//     if (!newFileData) {
//       console.log(identifier);
//       throw new Error();
//     }
//     const newRecord = {
//       ...record,
//       ...newFileData,
//     };
//     fs.appendFileSync("fileData-date.txt", `${JSON.stringify(newRecord)},\n`);
//     await addToIndex(newRecord);
//   }
//   console.log(identifiers.size);
// };

// const main = async () => {
//   const fileMetadata = await parseFileMetadata("egazette-sl.2024.csv");
//   console.log(fileMetadata.length);
//   const newNameMapping: Record<string, string> = {};
//   for (const file of fileMetadata) {
//     try {
//       // read file
//       const filePath = path.join(
//         process.env.PATH_TO_FILES,
//         file.folderName,
//         file.year,
//         file.fileName
//       );
//       const fileNumber = `${file.fileName
//         .replace(".pdf", "")
//         .replace(".htm", "")}`;
//       const isPdfFile = file.fileName.includes(".pdf");
//       const objectKey = `${file.year}/${file.category}/${
//         file.subCategory
//       }/${fileNumber}.${isPdfFile ? "pdf" : "htm"}`;
//       const newFileKey = `${file.title}-${file.notificationNumber}-${file.year}`;
//       newNameMapping[newFileKey] = objectKey;
//       const data = await fs.promises.readFile(filePath.trim());
//       // upload blob to s3
//       // await uploadBlob(EXTERNAL_S3_BUCKET, objectKey, data, isPdfFile);
//     } catch (err) {
//       const errMessage = `Error for file ${path.join(
//         process.env.PATH_TO_FILES,
//         file.folderName,
//         file.year,
//         file.fileName
//       )}: ${JSON.stringify(err.message)}\n`;
//       fs.appendFileSync("errors-repair-sl.txt", errMessage);
//     }
//   }
//   console.log(Object.keys(newNameMapping).length);
//   const data = fs.readFileSync(`fileData-sl.txt`, {
//     encoding: "utf8",
//   });
//   const rows: string[] = data.split("\n");

//   const toDelete = [];
//   const records: Record<string, SearchRecord & { text: string }> = {};
//   for (const row of rows) {
//     const record = JSON.parse(row.slice(0, -1));
//     const { objectID } = record;
//     toDelete.push(objectID);
//     records[objectID] = record;
//   }
//   // await searchIndex.deleteObjects(toDelete);
//   for (const rec of Object.values(records)) {
//     const fileKey = `${rec.title}-${rec.notificationNum}-${rec.publishYear}`;
//     const newFileUrl = new URL(newNameMapping[fileKey], baseStorageUrl).href;
//     const newObjectId =
//       newNameMapping[fileKey] + "-text-" + rec.objectID.split("-text-")[1];
//     const newInput = {
//       ...rec,
//       fileUrl: newFileUrl,
//       objectGroup: newNameMapping[fileKey],
//       objectID: newObjectId,
//     };
//     fs.appendFileSync(
//       "fileData-sl-repaired.txt",
//       `${JSON.stringify(newInput)},\n`
//     );
//     await addToIndex(newInput);
//   }
// };

// const main = async () => {
//   const data = fs.readFileSync(`fileData.txt`, {
//     encoding: "utf8",
//   });
//   const rows: string[] = data.split("\n");

//   const toDelete = [];
//   const records: Record<string, SearchRecord & { text: string }> = {};
//   for (const row of rows) {
//     const record = JSON.parse(row.slice(0, -1));
//     const { objectGroup, objectID } = record;
//     toDelete.push(objectID);
//     if (objectGroup in records) {
//       records[objectGroup].text += " " + record.text.slice(0, -1);
//     } else {
//       records[objectGroup] = { ...record, text: record.text.slice(0, -1) };
//     }
//   }
//   await searchIndex.deleteObjects(toDelete);
//   for (const rec of Object.values(records)) {
//     const newInput = {
//       title: rec.title,
//       category: rec.category,
//       subCategory: rec.subCategory,
//       notificationNum: rec.notificationNum,
//       publishDate: rec.publishDate,
//       publishTimestamp: rec.publishTimestamp,
//       fileUrl: rec.fileUrl,
//       objectGroup: rec.objectGroup,
//       publishYear: rec.publishYear,
//     };
//     if (!!rec.notificationNum) {
//       newInput.notificationNum = rec.notificationNum;
//     }
//     const newRecords = chunkContent(rec.text, newInput);
//     for (const entry of newRecords) {
//       fs.appendFileSync("fileData-repaired.txt", `${JSON.stringify(entry)},\n`);
//       await addToIndex(entry);
//     }
//   }
// };

// const main = async () => {
//   const data = fs.readFileSync(`fileData-sl.txt`, {
//     encoding: "utf8",
//   });
//   const rows: string[] = data.split("\n");

//   const toDelete = new Set();
//   const records: Record<string, SearchRecord & { text: string }> = {};
//   for (const row of rows) {
//     const record = JSON.parse(row.slice(0, -1));
//     const { fileUrl } = record;
//     const s3Link = fileUrl.split("https://assets.egazette.gov.sg/")[1];
//     if (toDelete.has(s3Link)) {
//       continue;
//     }
//     toDelete.add(s3Link);
//     const deleteParams = {
//       Bucket: EXTERNAL_S3_BUCKET,
//       Key: s3Link,
//     };
//     console.log(deleteParams);

//     const data = await s3Client.send(new DeleteObjectCommand(deleteParams));
//   }
//   console.log(toDelete.size);
// };

// // Fix for missing sl
// const main = async () => {
//   const FILENAME = "egazette-sl.20240801.csv";
//   const fileMetadata = await parseFileMetadataDate(FILENAME);
//   const data = fs.readFileSync(`errors-date.txt`, {
//     encoding: "utf8",
//   });

//   const rows: string[] = data.split("\n");

//   const identifiers = new Set();
//   for (const row of rows) {
//     if (!row) continue;
//     identifiers.add(row.split(" ")[3]);
//   }
//   console.log(identifiers.size);
//   console.log(fileMetadata.length);
//   for (const file of fileMetadata) {
//     if (!identifiers.has(`egazettes/${file.year}/${file.fileName}:`)) continue;
//     try {
//       const fileNumber =
//         file.notificationNumber && !FILENAME.includes("egazette-sl.")
//           ? file.notificationNumber
//           : `${file.fileName.replace(".pdf", "").replace(".htm", "")}`;
//       const isPdfFile = file.fileName.includes(".pdf");
//       const objectKey = `${
//         file.year
//       }/Legislative Supplements/Revised Subsidiary Legislation/${fileNumber}.${
//         isPdfFile ? "pdf" : "htm"
//       }`;

//       const publishDateString = new Date(file.publishDate).toLocaleDateString(
//         "en-SG"
//       );
//       const publishTimes = publishDateString.split("/");
//       const newMapping = {
//         publishDate: publishDateString,
//         publishYear: parseInt(publishTimes[2]!),
//         publishMonth: parseInt(publishTimes[1]!),
//         publishDay: parseInt(publishTimes[0]!),
//         publishTimestamp: new Date(file.publishDate).getTime(),
//       };

//       // parse text
//       const filePath = path.join(
//         process.env.PATH_TO_FILES,
//         "sl",
//         file.year,
//         file.fileName
//       );
//       const data = await fs.promises.readFile(filePath.trim());
//       // const parsedFile = isPdfFile
//       //   ? await parseFullTextFromPDF(data)
//       //   : await parseFullTextFromHtm(data);
//       const parsedFile = await parsePdfAsImage(filePath);
//       if (!parsedFile) throw new Error("Could not parse file content");
//       // upload to algolia
//       await addToSearchIndex({
//         gazetteCategory: "Legislative Supplements",
//         gazetteSubCategory: "Revised Subsidiary Legislation",
//         gazetteNotificationNum: file.notificationNumber,
//         gazetteTitle: file.title,
//         publishTime: file.publishDate,
//         objectKey,
//         content: parsedFile,
//       });
//     } catch (err) {
//       console.log(file.year, file.fileName);
//       const errMessage = `Error for file ${path.join(
//         process.env.PATH_TO_FILES,
//         file.year,
//         file.fileName
//       )}: ${JSON.stringify(err.message)}\n`;
//       fs.appendFileSync("errors-date.txt", errMessage);
//     }
//   }
// };

// // Fix for missing sl
// const main = async () => {
//   const FILENAME = "egazette-sl.20240801.csv";
//   const fileMetadata = await parseFileMetadataDate(FILENAME);
//   // const data = fs.readFileSync(`errors-date.txt`, {
//   //   encoding: "utf8",
//   // });

//   // const rows: string[] = data.split("\n");

//   const identifiers = new Set();
//   // for (const row of rows) {
//   //   if (!row) continue;
//   //   identifiers.add(row.split(" ")[3]);
//   // }
//   console.log(identifiers.size);
//   console.log(fileMetadata.length);
//   for (const file of fileMetadata) {
//     // if (!identifiers.has(`egazettes/${file.year}/${file.fileName}:`)) continue;
//     try {
//       const fileNumber =
//         file.notificationNumber && !FILENAME.includes("egazette-sl.")
//           ? file.notificationNumber
//           : `${file.fileName.replace(".pdf", "").replace(".htm", "")}`;
//       const isPdfFile = file.fileName.includes(".pdf");
//       const objectKey = `${
//         file.year
//       }/Legislative Supplements/Revised Subsidiary Legislation/${fileNumber}.${
//         isPdfFile ? "pdf" : "htm"
//       }`;
//       fs.appendFileSync("zzzz-proper-sl.txt", `${objectKey}\n`);

//       // const publishDateString = new Date(file.publishDate).toLocaleDateString(
//       //   "en-SG"
//       // );
//       // const publishTimes = publishDateString.split("/");
//       // const newMapping = {
//       //   publishDate: publishDateString,
//       //   publishYear: parseInt(publishTimes[2]!),
//       //   publishMonth: parseInt(publishTimes[1]!),
//       //   publishDay: parseInt(publishTimes[0]!),
//       //   publishTimestamp: new Date(file.publishDate).getTime(),
//       // };

//       // // parse text
//       // const filePath = path.join(
//       //   process.env.PATH_TO_FILES,
//       //   "sl",
//       //   file.year,
//       //   file.fileName
//       // );
//       // const data = await fs.promises.readFile(filePath.trim());
//       // // const parsedFile = isPdfFile
//       // //   ? await parseFullTextFromPDF(data)
//       // //   : await parseFullTextFromHtm(data);
//       // const parsedFile = await parsePdfAsImage(filePath);
//       // if (!parsedFile) throw new Error("Could not parse file content");
//       // // upload to algolia
//       // await addToSearchIndex({
//       //   gazetteCategory: "Legislative Supplements",
//       //   gazetteSubCategory: "Revised Subsidiary Legislation",
//       //   gazetteNotificationNum: file.notificationNumber,
//       //   gazetteTitle: file.title,
//       //   publishTime: file.publishDate,
//       //   objectKey,
//       //   content: parsedFile,
//       // });
//     } catch (err) {
//       console.log(file.year, file.fileName);
//       const errMessage = `Error for file ${path.join(
//         process.env.PATH_TO_FILES,
//         file.year,
//         file.fileName
//       )}: ${JSON.stringify(err.message)}\n`;
//       fs.appendFileSync("errors-date.txt", errMessage);
//     }
//   }
// };

main();

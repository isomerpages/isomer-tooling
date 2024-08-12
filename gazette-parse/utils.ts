import csv from "csv-parser";
import * as fs from "fs";

export type CsvMetadata = {
  filePath: string;
  notificationNumber: string;
  fileName: string;
  category: string;
  subCategory: string;
  title: string;
};

export type ObjectMetadata = {
  notificationNumber: string;
  fileName: string;
  category: string;
  subCategory: string;
  year: number;
};

export const getObjectKey = ({
  notificationNumber,
  fileName,
  year,
  category,
  subCategory,
}: ObjectMetadata) => {
  const fileNumber = notificationNumber
    ? notificationNumber
    : `${fileName.replace(".pdf", "").replace(".htm", "")}`;
  const isPdfFile = fileName.includes(".pdf");
  const objectKey = `${year}/${category}/${subCategory}/${fileNumber}.${
    isPdfFile ? "pdf" : "htm"
  }`;
  return objectKey;
};

export const parseMetadataCsv = async (
  filePath: string
): Promise<CsvMetadata[]> => {
  const results: CsvMetadata[] = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(`${filePath}`)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => {
        resolve(results);
      })
      .on("error", reject);
  });
};

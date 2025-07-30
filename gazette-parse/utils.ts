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

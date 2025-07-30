import { Parser } from "htmlparser2";
import { parseMetadataCsv } from "./utils";
import { getObjectKey } from "./utils/getObjectKey";
import { parsePdfAsImageAndExtractText } from "./utils/parsePdfAsImageAndExtractText";
const { PdfReader } = require("pdfreader");
import * as fs from "fs";
import path from "path";
import { addToSearchIndex } from "./utils/algolia";

const METADATA_PATH = "./metadata.csv";

const { ALGOLIA_APP_ID, ALGOLIA_API_KEY, ALGOLIA_INDEX_NAME } = process.env;

if (!ALGOLIA_APP_ID || !ALGOLIA_INDEX_NAME || !ALGOLIA_API_KEY) {
  throw new Error("Missing env vars");
}

export const baseStorageUrl = "https://assets.egazette.gov.sg";

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


const main = async () => {
  const args = process.argv.slice(2);
  let shouldUseImageParse = false;
  let shouldUpload = true;
  if (args.includes("image")) {
    shouldUseImageParse = true;
  }
  if (args.includes("noUpload")) {
    shouldUpload = false;
  }
  const fileData = await parseMetadataCsv(METADATA_PATH);
  const publishDate = new Date();
  const year = publishDate.getFullYear();
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
    // parse text
    const parsedFile = shouldUseImageParse
      ? await parsePdfAsImageAndExtractText(filePath)
      : isPdfFile
      ? await parseFullTextFromPDF(data)
      : await parseFullTextFromHtm(data);
    if (!parsedFile) throw new Error("Could not parse file content");
    // upload to algolia
    if (shouldUpload)
      await addToSearchIndex({
        algoliaAppId: ALGOLIA_APP_ID,
        algoliaApiKey: ALGOLIA_API_KEY,
        algoliaIndexName: ALGOLIA_INDEX_NAME,
        baseStorageUrl: baseStorageUrl,
        gazetteCategory: file.category,
        gazetteSubCategory: file.subCategory,
        gazetteNotificationNum: file.notificationNumber,
        gazetteTitle: file.title,
        publishDate: publishDate,
        objectKey: objectKey,
        content: parsedFile,
      });
    else {
      console.log(parsedFile);
    }
  }
};

main();

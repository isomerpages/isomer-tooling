import { Parser } from "htmlparser2";
const { PDFImage } = require("pdf-image");
const Tesseract = require("tesseract.js");
import algoliasearch from "algoliasearch";
import { getObjectKey, parseMetadataCsv } from "./utils";
const { PdfReader } = require("pdfreader");
import * as fs from "fs";
import path from "path";

const METADATA_PATH = "./metadata.csv";

const { ALGOLIA_APP_ID, ALGOLIA_API_KEY, ALGOLIA_INDEX_NAME } = process.env;

if (!ALGOLIA_APP_ID || !ALGOLIA_INDEX_NAME || !ALGOLIA_API_KEY) {
  throw new Error("Missing env vars");
}

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
const searchIndex = searchClient.initIndex(ALGOLIA_INDEX_NAME);

export const baseStorageUrl = "https://assets.egazette.gov.sg";

interface AddSearchToIndexProps {
  gazetteCategory: string;
  gazetteSubCategory: string;
  gazetteNotificationNum?: string;
  gazetteTitle: string;
  publishTime: string;
  objectKey: string;
  content: string;
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

function toTimestamp(strDate: string) {
  const datum = new Date(strDate);
  return datum.getTime();
}

// Function to convert PDF to high-resolution images
async function parsePdfAsImage(pdfPath: string) {
  const pdfImage = new PDFImage(pdfPath, {
    convertOptions: {
      "-density": "300", // Set the DPI to 300 for better quality
      "-quality": "100",
    },
  });
  const pages = await pdfImage.numberOfPages();
  const imagePaths: any[] = [];

  for (let i = 0; i < pages; i++) {
    const imagePath = await pdfImage.convertPage(i);
    imagePaths.push(imagePath);
  }

  const texts: any[] = [];

  for (const imagePath of imagePaths) {
    const result = await Tesseract.recognize(imagePath, "eng", {
      // logger: (m: string) => console.log(m), // optional logger to see the OCR process
    });
    texts.push(result.data.text);
  }

  return texts.join(" ");
}

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

  const textChunks: any[] = [];
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
  const publishTimes = publishTime.split("/");

  const newSearchRecord = {
    category: gazetteCategory!,
    subCategory: gazetteSubCategory || "",
    notificationNum: gazetteNotificationNum!,
    title: gazetteTitle!,
    publishDate: publishTime,
    publishYear: parseInt(publishTimes[2]!),
    publishMonth: parseInt(publishTimes[1]!),
    publishDay: parseInt(publishTimes[0]!),
    publishTimestamp: toTimestamp(publishTime),
    fileUrl: new URL(objectKey, baseStorageUrl).href,
    objectGroup: objectKey,
  };

  console.log(`Adding record ${newSearchRecord} to search index`);

  // publish to index
  const records = await chunkContent(content, newSearchRecord);
  try {
    for (const record of records) {
      fs.appendFileSync("fileData.txt", `${JSON.stringify(record)},\n`);
      await addToIndex(record);
    }
  } catch (e) {
    console.error({ message: `Adding to search index failed`, error: e });
    throw e;
  }
};

const main = async () => {
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
    const parsedFile = isPdfFile
      ? await parseFullTextFromPDF(data)
      : await parseFullTextFromHtm(data);
    // const parsedFile = await parsePdfAsImage(filePath);
    if (!parsedFile) throw new Error("Could not parse file content");
    // upload to algolia
    await addToSearchIndex({
      gazetteCategory: file.category,
      gazetteSubCategory: file.subCategory,
      gazetteNotificationNum: file.notificationNumber,
      gazetteTitle: file.title,
      publishTime: publishDate.toLocaleDateString("en-SG"),
      objectKey: objectKey,
      content: parsedFile,
    });
  }
};

main();

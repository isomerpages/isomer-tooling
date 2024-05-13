import * as fs from "fs";
import * as pdf from "pdf-parse";
import algoliasearch from "algoliasearch";
const { PdfReader } = require("pdfreader");

const { ALGOLIA_APP_ID, ALGOLIA_WRITE_API_KEY, ALGOLIA_INDEX_NAME } =
  process.env;

type SearchRecord = {
  objectID: string;
  objectGroup: string;
  title: string;
  category: string;
  subCategory: string;
  notificationNum: string;
  publishDate: string;
  publishTimestamp: number;
  fileUrl: string;
};

const parseFullTextFromPDF = async (
  pdfBuffer: Buffer,
  objectMetadata: SearchRecord
) => {
  const {
    objectID,
    objectGroup,
    title,
    category,
    subCategory,
    notificationNum,
    publishDate,
    publishTimestamp,
    fileUrl,
  } = objectMetadata;

  let data: string[] = await new Promise((resolve, reject) => {
    let parsedData: string[] = [];
    new PdfReader().parseBuffer(pdfBuffer, (err: any, item: any) => {
      if (err) {
        console.error("error:", err);
        reject(err);
      } else if (!item) {
        resolve(parsedData);
      } else if (item.text) {
        parsedData.push(item.text);
      }
    });
  });

  const parsedText = data.join(" ");
  const maxSizeInBytes = 7000; // 50kb limit for searchable result, with buffer
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
    objectGroup: objectID,
    objectID: `${objectID}${idx === 0 ? "" : `-text-${idx}`}`,
  }));
};

const parsePdf = async () => {
  try {
    const files = ["./longer.pdf"];
    for (const filePath of files) {
      const pdfBuffer = fs.readFileSync(filePath);
      // const result = await parseFullTextFromPDF(pdfBuffer, "");

      let data: string[] = await new Promise((resolve, reject) => {
        let parsedData: string[] = [];
        new PdfReader().parseBuffer(pdfBuffer, (err: any, item: any) => {
          if (err) {
            console.error("error:", err);
            reject(err);
          } else if (!item) {
            console.warn("end of buffer");
            resolve(parsedData);
          } else if (item.text) {
            console.log(item.text);
            parsedData.push(item.text);
          }
        });
      });

      const parsedText = data.join(" ");
      const maxSizeInBytes = 30000; // 100kb limit, with buffer
      const regexPattern = new RegExp(`.{1,${maxSizeInBytes}}(?:\\s|$)`, "g");

      const textChunks = [];
      let match;
      while ((match = regexPattern.exec(parsedText)) !== null) {
        textChunks.push(match[0]);
      }
      console.log(textChunks);
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

async function fetchPdf(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    const errorMessage = await response.text();
    throw new Error(`Failed to download PDF: ${errorMessage}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

const parseAllFiles = async () => {
  if (!ALGOLIA_APP_ID || !ALGOLIA_WRITE_API_KEY) {
    console.log("Missing algolia env vars");
    return;
  }
  const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_API_KEY);
  const index = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);
  await index.setSettings({
    // NOTE: This is in order of priority
    searchableAttributes: [
      "title",
      "category",
      "subCategory",
      "publishDate,notificationNum",
      "fileUrl",
      "text",
    ],
    customRanking: ["desc(publishTimestamp)"],
    distinct: true,
    attributeForDistinct: "objectGroup",
  });
  let hits: SearchRecord[] = [];
  await index.browseObjects<SearchRecord>({
    batch: (batch) => {
      hits = hits.concat(batch);
    },
  });

  for (const hit of hits) {
    // Needs to be sequential, otherwise we end up hitting rate limits
    const { objectGroup, fileUrl } = hit;
    if (objectGroup) {
      // Already parsed previously
      continue;
    }
    try {
      const fileData = await fetchPdf(fileUrl);
      const chunkedObjects = await parseFullTextFromPDF(fileData, hit);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      for (const searchObj of chunkedObjects) {
        await index.saveObject(searchObj);
      }
    } catch {
      continue;
    }
  }
};

parseAllFiles();


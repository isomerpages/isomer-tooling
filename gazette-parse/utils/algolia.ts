import algoliasearch from "algoliasearch";
import type { SearchIndex } from "algoliasearch";

import * as fs from "fs";

type GazetteMetadata = {
	title: string;
	category: string;
	subCategory: string;
	notificationNum?: string;
	publishDate: string;
	publishTime: string;
};

type SearchRecord = Omit<
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

  const textChunks: string[] = [];
  let match: RegExpExecArray | null;
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

const addToIndex = async (searchIndex: SearchIndex, record: SearchRecord) => {
  try {
    await searchIndex.saveObject(record);
  } catch (e) {
    console.error(`Error while adding to index: ${JSON.stringify(e)}`);
  }
};

interface AddSearchToIndexProps {
  algoliaAppId: string;
  algoliaApiKey: string;
  algoliaIndexName: string;
  baseStorageUrl: string;
  gazetteCategory: string;
  gazetteSubCategory: string;
  gazetteNotificationNum?: string;
  gazetteTitle: string;
  publishDate: Date;
  objectKey: string;
  content: string;
}

export const addToSearchIndex = async ({
  algoliaAppId,
  algoliaApiKey,
  algoliaIndexName,
  baseStorageUrl,
	gazetteCategory,
	gazetteSubCategory,
	gazetteNotificationNum,
	gazetteTitle,
	publishDate,
	objectKey,
	content,
}: AddSearchToIndexProps) => {
  const searchClient = algoliasearch(algoliaAppId, algoliaApiKey);
  const searchIndex = searchClient.initIndex(algoliaIndexName);

	const publishDateSG = publishDate.toLocaleDateString("en-SG");
	const publishTimes = publishDateSG.split("/");

	const newSearchRecord = {
		category: gazetteCategory!,
		subCategory: gazetteSubCategory || "",
		notificationNum: gazetteNotificationNum!,
		title: gazetteTitle!,
		publishDate: publishDateSG,
		publishYear: parseInt(publishTimes[2]!),
		publishMonth: parseInt(publishTimes[1]!),
		publishDay: parseInt(publishTimes[0]!),
		publishTimestamp: publishDate.getTime(),
		fileUrl: new URL(objectKey, baseStorageUrl).href,
		objectGroup: objectKey,
	};

	console.log(`Adding record ${newSearchRecord} to search index`);

	// publish to index
	const records = chunkContent(content, newSearchRecord);
	try {
		for (const record of records) {
			fs.appendFileSync("fileData.txt", `${JSON.stringify(record)},\n`);
			await addToIndex(searchIndex, record);
		}
	} catch (e) {
		console.error({ message: `Adding to search index failed`, error: e });
		throw e;
	}
};

import type { InitSearchIndexProps } from "./algolia";
import { initSearchIndex } from "./algolia";

interface GetAlgoliaObjectIdsProps extends InitSearchIndexProps {
  objectKey: string;
}

export const getAlgoliaObjectIds = async ({
  algoliaAppId,
  algoliaApiKey,
  algoliaIndexName,
  objectKey,
}: GetAlgoliaObjectIdsProps) => {
  const searchIndex = initSearchIndex({
    algoliaAppId,
    algoliaApiKey,
    algoliaIndexName,
  });

  // Loop through `-text-X` suffix one by one to retrive all chunks
  const objectIds: string[] = [];
  let objectIdIndex = 0;
  while (true) {
    const chunkObjectId = `${objectKey}-text-${objectIdIndex}`;
    try {
      // Try to get the object by objectID
      const obj = await searchIndex.getObject(
        chunkObjectId,
        { attributesToRetrieve: ['objectID'] }
      );
      if (obj && obj.objectID) {
        objectIds.push(obj.objectID);
        objectIdIndex++;
      } else {
        break;
      }
    } catch (error: any) {
      // If not found, Algolia throws an error with status 404
      if (error.status === 404 || (error.statusCode && error.statusCode === 404)) {
        break;
      } else {
        console.error(`Error retrieving Algolia object ${chunkObjectId}:`, error);
        throw error;
      }
    }
  }

  return objectIds;
};
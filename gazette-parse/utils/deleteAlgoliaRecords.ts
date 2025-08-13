import type { InitSearchIndexProps } from "./algolia";
import { initSearchIndex } from "./algolia";

interface DeleteAlgoliaRecordsProps extends InitSearchIndexProps {
  objectIds: string[];
}

export const deleteAlgoliaRecords = async ({
  algoliaAppId,
  algoliaApiKey,
  algoliaIndexName,
  objectIds,
}: DeleteAlgoliaRecordsProps) => {
  const searchIndex = initSearchIndex({
    algoliaAppId,
    algoliaApiKey,
    algoliaIndexName,
  });

  for (const objectId of objectIds) {
    await searchIndex.deleteObject(objectId);
  }
};
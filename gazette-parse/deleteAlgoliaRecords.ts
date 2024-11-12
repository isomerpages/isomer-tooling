import algoliasearch from "algoliasearch";

const { ALGOLIA_APP_ID, ALGOLIA_API_KEY, ALGOLIA_INDEX_NAME } = process.env;

if (!ALGOLIA_APP_ID || !ALGOLIA_INDEX_NAME || !ALGOLIA_API_KEY) {
  throw new Error("Missing env vars");
}

const main = async () => {
  const args = process.argv.slice(2); 

  if (args.length !== 2) {
    console.log(
      "Please provide the objectGroup, followed by the number of entries."
    );
    process.exit(1);
  }

  const [objectGroup, numEntries] = args;

  const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);
  const searchIndex = searchClient.initIndex(ALGOLIA_INDEX_NAME);

  const toDelete: string[] = [];
  for (let i = 0; i < Number(numEntries); i++) {
    toDelete.push(`${objectGroup}-text-${i}`);
  }

  console.log(`Deleting entries from ${ALGOLIA_INDEX_NAME}`);
  await searchIndex.deleteObjects(toDelete);
};
main();

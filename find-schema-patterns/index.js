const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { Client } = require("pg");
const env = require("dotenv").config();

// Configure the list of repositories to scan through
const REPOSITORIES = [
  "mti-corp",
  "agc-corp-next",
  "moh-spc-next",
  "moh-tcmpb-next",
  "ipos-corp-next",
  "ncss-corp-next",
  "mnd-clc-next",
  "mddi-reach-next",
  "csa-corp-next",
  "muis-corp-next",
  "isomer-sample-next",
  "mddi-govsg-next",
  "mddi-factually-next",
  "mnd-clc-resourcehub-next",
  "ogp-hfpg-next",
  "test-isomer-next",
];
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;

const COMPONENTS_WITH_TITLES = [
  "infobar",
  "infocards",
  "infocols",
  "infopic",
  "keystatistics",
];

const isSchemaPatternMatched = (jsonContent) => {
  // if (jsonContent.layout === "index") {
  //   return true;
  // }

  if (
    jsonContent.layout !== "homepage" &&
    jsonContent.content &&
    jsonContent.content.some(
      (c) => COMPONENTS_WITH_TITLES.includes(c.type) && !!c.title
    )
  ) {
    return true;
  }

  // const recursiveSearch = (content) => {
  //   if (content.type === "tableCell") {
  //     if (
  //       content.content.length > 0 &&
  //       content.content.some((block) => block.type === "orderedList")
  //     ) {
  //       return true;
  //     }
  //   }

  //   // Start of recursion for nested blocks
  //   if (
  //     ["prose", "table", "tableRow", "tableHeader", "tableCell"].includes(
  //       content.type
  //     ) &&
  //     content.content
  //   ) {
  //     try {
  //       return content.content.some((block) => recursiveSearch(block));
  //     } catch (e) {
  //       console.log(content);
  //       throw e;
  //     }
  //   } else if (content.type === "accordion") {
  //     return recursiveSearch(content.details);
  //   } else if (content.type === "callout" || content.type === "contentpic") {
  //     return recursiveSearch(content.content);
  //   }

  //   return false;
  // };

  // if (jsonContent.content) {
  //   return jsonContent.content.some((block) => recursiveSearch(block));
  // }

  return false;
};

const isSchemaPatternMatchedGitHub = (contents) => {
  const jsonContent = JSON.parse(contents);
  return isSchemaPatternMatched(jsonContent);
};

const isSchemaPatternMatchedDb = (contents) => {
  try {
    return isSchemaPatternMatched(contents);
  } catch (e) {
    console.log(contents);
    throw e;
  }
};

const checkGitHubRepos = async () => {
  for (const repository of REPOSITORIES) {
    // Step 1: Git clone the repository if it doesn't exist
    console.log(`Checking repository: ${repository}`);
    const reposDir = path.join(__dirname, "repos");
    const cloneDir = path.join(reposDir, repository);

    if (!fs.existsSync(cloneDir)) {
      await new Promise((resolve, reject) => {
        exec(
          `git clone https://oauth2:${GITHUB_TOKEN}@github.com/isomerpages/${repository}.git ${cloneDir}`,
          (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
    } else {
      await new Promise((resolve, reject) => {
        exec(`git -C ${cloneDir} pull`, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    // Step 2: Recursively get all the schema files in the repository
    const schemaDir = path.join(cloneDir, "schema");
    const schemaFiles = fs.readdirSync(schemaDir, {
      withFileTypes: true,
      recursive: true,
    });

    // Step 3: Run the schema pattern matching function on each schema file
    for (const file of schemaFiles) {
      if (file.isFile() && file.name.endsWith(".json")) {
        const filePath = path.join(file.path, file.name);
        const fileContent = fs.readFileSync(filePath, "utf8");

        if (fileContent.length === 0) {
          console.log(`Empty file ${filePath}`);
          continue;
        }

        const isMatched = isSchemaPatternMatchedGitHub(fileContent);
        const relativeFilePath = path.join(
          "/",
          path.relative(schemaDir, filePath)
        );

        if (isMatched) {
          console.log(`Schema patterns found in ${relativeFilePath}`);
        }
      }
    }
  }
};

const checkDBBlobs = async () => {
  // Step 1: Connect to the database
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    await client.connect();

    console.log("Connected to the database");

    // Step 2: Query the database for all the live resources
    const allResources =
      await client.query(`SELECT "Resource".id, "Resource"."siteId", "Blob".content
FROM "Resource"
JOIN "Blob" ON "Resource"."draftBlobId" = "Blob".id
WHERE "Resource"."draftBlobId" IS NOT NULL
UNION
SELECT "Resource".id, "Resource"."siteId", "Blob".content FROM "Resource"
JOIN "Version" ON "Resource"."publishedVersionId" = "Version".id
JOIN "Blob" ON "Version"."blobId" = "Blob".id;`);

    // Step 3: Run the schema pattern matching function on each live resource
    for (const resource of allResources.rows) {
      const isMatched = isSchemaPatternMatchedDb(resource.content);

      if (isMatched) {
        console.log(
          `Schema patterns found in resource ID ${resource.id} from site ID ${resource.siteId}: https://studio.isomer.gov.sg/sites/${resource.siteId}/pages/${resource.id}`
        );
      }
    }
  } catch (e) {
    console.error("An error occurred");
    throw e;
  } finally {
    await client.end();
  }
};

const main = async () => {
  // Check the GitHub repositories to see if the schema pattern matches
  await checkGitHubRepos();

  // Check the blobs in the database to see if the schema pattern matches
  await checkDBBlobs();
};

main();

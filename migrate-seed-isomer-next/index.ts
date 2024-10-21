import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { performance } from "perf_hooks";
import * as dotenv from "dotenv";
import { Client } from "pg";

import { Octokit } from "@octokit/rest";
import { exec } from "child_process";
import { GET_ALL_RESOURCES_WITH_FULL_PERMALINKS } from "./constants";

// These are the sites to migrate and their corresponding site IDs inside the
// Studio database.
export const MIGRATING_SITES_MAPPING: Record<string, number> = {
  // "moh-corp-next": 3,
  // "moh-biosafety-next": 4,
  // "moh-prepare-next": 5,
  "moh-dc-next": 6,
  // "moh-hcsa-next": 7,
  // "mddi-forwardsg-next": 8,
};

// Do not touch below this line
interface Resource {
  id: number;
  title: string;
  permalink: string;
  parentId: number | null;
  type: string;
  fullPermalink: string;
  blobId: number | null;
}

dotenv.config();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  const start = performance.now(); // Start profiling

  try {
    await client.connect();

    console.log("Successfully connected to the database");

    for (const [siteName, siteId] of Object.entries(MIGRATING_SITES_MAPPING)) {
      const siteExists = await ensureSiteExists(client, siteId, siteName);

      if (!siteExists) {
        throw new Error(`Error: Site with ID ${siteId} does not exist.`);
      }

      await seedDatabase(client, siteId, siteName);

      await studioifySite(client, siteId, siteName);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
    const end = performance.now(); // End profiling
    console.log(
      `Database seeding completed in ${(end - start) / 1000} seconds`
    );
  }
}

async function ensureSiteExists(
  client: Client,
  siteId: number,
  siteName: string
): Promise<boolean> {
  try {
    // Ensure that the GitHub repository exists
    await octokit.repos.get({
      owner: "isomerpages",
      repo: siteName,
    });

    // Git clone the repository
    const cloneDir = path.join(__dirname, "repos");
    await new Promise<void>((resolve, reject) => {
      exec(
        `git clone https://oauth2:${process.env.GITHUB_TOKEN}@github.com/isomerpages/${siteName}.git ${cloneDir}/${siteName}`,
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    const result = await client.query(
      `SELECT id FROM public."Site" WHERE id = $1`,
      [siteId]
    );
    return result.rows.length > 0;
  } catch (err) {
    console.error(`Pre-flight checks failed for ${siteName}`);
    console.error(err);
    return false;
  }
}

async function seedDatabase(client: Client, siteId: number, siteName: string) {
  async function processDirectory(
    dirPath: string,
    parentId: number | null,
    isParentCollection?: boolean
  ) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const folders = entries.filter((entry) => entry.isDirectory());
    const folderNames = folders.map((folder) => folder.name);
    const independentPages = entries.filter(
      (entry) =>
        !entry.isDirectory() &&
        entry.name.endsWith(".json") &&
        !folderNames.includes(entry.name.slice(0, -5))
    );

    for (const folder of folders) {
      console.log(`Processing folder: ${folder.name}`);
      const fullPath = path.join(dirPath, folder.name);

      // Find for the corresponding index page if it exists
      const isIndexPagePresent = entries.some(
        (entry) => !entry.isDirectory() && entry.name === `${folder.name}.json`
      );

      if (isIndexPagePresent) {
        console.log(`Found index page for folder ${folder.name}`);
        const indexPagePath = path.join(dirPath, `${folder.name}.json`);
        const content = JSON.parse(fs.readFileSync(indexPagePath, "utf-8"));
        const title = content.page?.title || folder.name;
        const permalink = "_index"; // Special permalink for index pages

        const isCollection = content.layout === "collection";

        if (isCollection) {
          // Create the collection resource
          const folderResourceId = await createResource(client, {
            title: folder.name,
            permalink: folder.name.toLowerCase(), // Use folder name as permalink
            parentId,
            type: "Collection",
            siteId,
          });

          const blobId = await createBlob(client, content);
          const resourceId = await createResource(client, {
            title,
            permalink,
            parentId: folderResourceId,
            type: "IndexPage",
            siteId,
          });
          await createVersion(client, resourceId, blobId);

          await processDirectory(fullPath, folderResourceId, true);
        } else {
          // Create the folder resource
          const folderResourceId = await createResource(client, {
            title: folder.name,
            permalink: folder.name.toLowerCase(), // Use folder name as permalink
            parentId,
            type: "Folder",
            siteId,
          });

          const blobId = await createBlob(client, content);
          const resourceId = await createResource(client, {
            title,
            permalink,
            parentId: folderResourceId,
            type: "IndexPage",
            siteId,
          });
          await createVersion(client, resourceId, blobId);

          await processDirectory(fullPath, folderResourceId);
        }
      } else {
        // Create the folder resource
        const folderResourceId = await createResource(client, {
          title: folder.name,
          permalink: folder.name.toLowerCase(), // Use folder name as permalink
          parentId,
          type: "Folder",
          siteId,
        });

        await processDirectory(fullPath, folderResourceId);
      }
    }

    for (const page of independentPages) {
      console.log(`Processing page: ${page.name}`);
      const isRootPage = page.name === "index.json" && parentId === null;

      const fullPath = path.join(dirPath, page.name);
      const content = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
      const title = content.page?.title || path.basename(page.name, ".json");
      const permalink = isRootPage
        ? "" // FIXME: This should be "_index" but Studio is not fully ready for this yet
        : path.basename(page.name, ".json").toLowerCase(); // Only use the file name without extension
      const isCollectionLink =
        content.layout === "link" || content.layout === "file";

      if (content.layout === "file") {
        content.layout = "link";
      }

      const blobId = await createBlob(client, content);
      const resourceId = await createResource(client, {
        title,
        permalink,
        parentId,
        type: isRootPage
          ? "RootPage"
          : isParentCollection
          ? isCollectionLink
            ? "CollectionLink"
            : "CollectionPage"
          : "Page",
        siteId,
      });
      await createVersion(client, resourceId, blobId);
    }
  }

  const schemaDir = path.join(__dirname, "repos", siteName, "schema");
  await processDirectory(schemaDir, null);

  await importSiteConfig(client, siteId, siteName);
  await importNavbar(client, siteId, siteName);
  await importFooter(client, siteId, siteName);
}

async function createBlob(client: Client, content: any): Promise<number> {
  const { permalink, lastModified, ...rest } = content.page;
  const newContent = {
    ...content,
    page: rest,
  };

  const result = await client.query(
    `INSERT INTO public."Blob" (content) VALUES ($1) RETURNING id`,
    [JSON.stringify(newContent)]
  );
  return result.rows[0].id;
}

async function createResource(
  client: Client,
  {
    title,
    permalink,
    parentId,
    type,
    siteId,
  }: {
    title: string;
    permalink: string;
    parentId: number | null;
    type:
      | "Page"
      | "Folder"
      | "IndexPage"
      | "RootPage"
      | "Collection"
      | "CollectionPage"
      | "CollectionLink";
    siteId: number;
  }
): Promise<number> {
  const result = await client.query(
    `INSERT INTO public."Resource" (title, permalink, "parentId", type, state, "publishedVersionId", "siteId") VALUES ($1, $2, $3, $4, $5, NULL, $6) RETURNING id`,
    [title, permalink, parentId, type, "Published", siteId]
  );
  return result.rows[0].id;
}

async function createVersion(
  client: Client,
  resourceId: number,
  blobId: number
) {
  const result = await client.query(
    `INSERT INTO public."Version" ("resourceId", "blobId", "versionNum", "publishedBy") VALUES ($1, $2, $3, $4) RETURNING id`,
    [resourceId, blobId, 1, process.env.PUBLISHER_USER_ID]
  );
  const versionId = result.rows[0].id;

  // Update the resource with the new publishedVersionId
  await client.query(
    `UPDATE public."Resource" SET "publishedVersionId" = $1 WHERE id = $2`,
    [versionId, resourceId]
  );
}

async function importSiteConfig(
  client: Client,
  siteId: number,
  siteName: string
) {
  console.log("Importing site config");
  const siteConfigPath = path.join(
    __dirname,
    "repos",
    siteName,
    "data",
    "config.json"
  );

  // Split config and theme
  const config = JSON.parse(fs.readFileSync(siteConfigPath, "utf-8"));
  const theme = {
    colors: {
      brand: config.colors.brand,
    },
  };
  const siteConfig = config.site;

  await client.query(
    `UPDATE public."Site" SET config = $1, theme = $2 WHERE id = $3`,
    [siteConfig, theme, siteId]
  );
}

async function importNavbar(client: Client, siteId: number, siteName: string) {
  console.log("Importing navbar");
  const navbarPath = path.join(
    __dirname,
    "repos",
    siteName,
    "data",
    "navbar.json"
  );
  const navbar = fs.readFileSync(navbarPath, "utf-8");

  await client.query(
    `INSERT INTO public."Navbar" ("siteId", content) VALUES ($1, $2)`,
    [siteId, navbar]
  );
}

async function importFooter(client: Client, siteId: number, siteName: string) {
  console.log("Importing footer");
  const footerPath = path.join(
    __dirname,
    "repos",
    siteName,
    "data",
    "footer.json"
  );
  const footer = fs.readFileSync(footerPath, "utf-8");

  await client.query(
    `INSERT INTO public."Footer" ("siteId", content) VALUES ($1, $2)`,
    [siteId, footer]
  );
}

async function studioifySite(client: Client, siteId: number, siteName: string) {
  const assetsMap = getAssetsMapping(siteId, siteName);
  const resourcesMap = await getResourceMapping(client, siteId);
  const pages = Object.keys(resourcesMap).filter((resourceId) => {
    return resourcesMap[resourceId].blobId !== null;
  });

  for (const page of pages) {
    const resource = resourcesMap[page];
    const content = await getBlob(client, resource.blobId!);
    const updatedContent = studioifyContent(
      content,
      siteId,
      assetsMap,
      resourcesMap
    );
    await updateBlob(client, resource.blobId!, updatedContent);
  }

  const navbarContent = await getNavbar(client, siteId);
  const updatedNavbar = studioifyContent(
    navbarContent,
    siteId,
    assetsMap,
    resourcesMap
  );
  await updateNavbar(client, siteId, updatedNavbar);

  const footerContent = await getFooter(client, siteId);
  const updatedFooter = studioifyContent(
    footerContent,
    siteId,
    assetsMap,
    resourcesMap
  );
  await updateFooter(client, siteId, updatedFooter);

  const siteConfigContent = await getSiteConfig(client, siteId);
  const updatedSiteConfig = studioifyContent(
    siteConfigContent,
    siteId,
    assetsMap,
    resourcesMap
  );
  await updateSiteConfig(client, siteId, updatedSiteConfig);
}

function getAssetsMapping(siteId: number, siteName: string) {
  // Get the list of images and files in the site
  const siteDir = path.join(__dirname, "repos", siteName);
  const publicDir = path.join(siteDir, "public");
  const imagesDir = path.join(publicDir, "images");
  const filesDir = path.join(publicDir, "files");
  const assetsDir = path.join(__dirname, "assets");

  const images = getFiles(imagesDir).map((file) =>
    path.relative(publicDir, file)
  );
  const files = getFiles(filesDir).map((file) =>
    path.relative(publicDir, file)
  );
  const allAssets = [...images, ...files];

  // Create the assets directory for the site
  const siteAssetsDir = path.join(assetsDir, String(siteId));
  if (!fs.existsSync(siteAssetsDir)) {
    fs.mkdirSync(siteAssetsDir, { recursive: true });
  }

  // Generate the new paths for the images and files and store as a mapping
  const assetsMap: Record<string, string> = {};

  for (const asset of allAssets) {
    const assetName = path.basename(asset);
    const newAssetFolder = path.join(siteAssetsDir, crypto.randomUUID());

    const newAssetPath = path.join(newAssetFolder, assetName);

    // Create the folder at the new location
    if (!fs.existsSync(newAssetFolder)) {
      fs.mkdirSync(newAssetFolder, { recursive: true });
    }

    // Copy the file to the new location
    fs.copyFileSync(path.join(publicDir, asset), newAssetPath);

    // Store the mapping
    assetsMap[path.join("/", asset)] = path.join(
      "/",
      path.relative(assetsDir, newAssetPath)
    );
  }

  return assetsMap;
}

function getFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((file) => {
    const fullPath = path.join(directory, file.name);

    if (file.isDirectory()) {
      return getFiles(fullPath);
    }

    if (file.name === ".keep") {
      return [];
    }

    return [fullPath];
  });
}

async function getResourceMapping(client: Client, siteId: number) {
  const sitemapArray = await getSitemapArray(client, siteId);
  const resourcesMap: Record<string, Resource> = {};

  for (const resource of sitemapArray) {
    resourcesMap[path.join("/", resource.fullPermalink)] = resource;
  }

  return resourcesMap;
}

async function getSitemapArray(
  client: Client,
  siteId: number
): Promise<Resource[]> {
  const result = await client.query(GET_ALL_RESOURCES_WITH_FULL_PERMALINKS, [
    siteId,
  ]);
  return result.rows;
}

async function getBlob(client: Client, blobId: number): Promise<string> {
  const result = await client.query(
    `SELECT content FROM public."Blob" WHERE id = $1`,
    [blobId]
  );
  return JSON.stringify(result.rows[0].content);
}

async function updateBlob(client: Client, blobId: number, content: string) {
  try {
    await client.query(`UPDATE public."Blob" SET content = $1 WHERE id = $2`, [
      content,
      blobId,
    ]);
  } catch (err) {
    console.error(content);
    console.error(err);
    throw new Error();
  }
}

async function getNavbar(client: Client, siteId: number): Promise<string> {
  const result = await client.query(
    `SELECT content FROM public."Navbar" WHERE "siteId" = $1`,
    [siteId]
  );
  return JSON.stringify(result.rows[0].content);
}

async function updateNavbar(client: Client, siteId: number, content: string) {
  try {
    await client.query(
      `UPDATE public."Navbar" SET content = $1 WHERE "siteId" = $2`,
      [content, siteId]
    );
  } catch (err) {
    console.error(content);
    console.error(err);
    throw new Error();
  }
}

async function getFooter(client: Client, siteId: number): Promise<string> {
  const result = await client.query(
    `SELECT content FROM public."Footer" WHERE "siteId" = $1`,
    [siteId]
  );
  return JSON.stringify(result.rows[0].content);
}

async function updateFooter(client: Client, siteId: number, content: string) {
  try {
    await client.query(
      `UPDATE public."Footer" SET content = $1 WHERE "siteId" = $2`,
      [content, siteId]
    );
  } catch (err) {
    console.error(content);
    console.error(err);
    throw new Error();
  }
}

async function getSiteConfig(client: Client, siteId: number): Promise<string> {
  const result = await client.query(
    `SELECT config FROM public."Site" WHERE id = $1`,
    [siteId]
  );
  return JSON.stringify(result.rows[0].config);
}

async function updateSiteConfig(
  client: Client,
  siteId: number,
  config: string
) {
  try {
    await client.query(`UPDATE public."Site" SET config = $1 WHERE id = $2`, [
      config,
      siteId,
    ]);
  } catch (err) {
    console.error(config);
    console.error(err);
    throw new Error();
  }
}

function studioifyContent(
  content: string,
  siteId: number,
  assetsMap: Record<string, string>,
  resourcesMap: Record<string, Resource>
): string {
  let newContent = content;

  for (const asset of Object.keys(assetsMap)) {
    newContent = newContent
      .replace(`"${asset}"`, `"${assetsMap[asset]}"`)
      .replace(`'${asset}'`, `'${assetsMap[asset]}'`);
  }

  for (const page of Object.keys(resourcesMap)) {
    newContent = newContent
      .replace(
        `"${page}"`,
        `"[resource:${String(siteId)}:${String(resourcesMap[page].id)}]"`
      )
      .replace(
        `"${page}/"`,
        `"[resource:${String(siteId)}:${String(resourcesMap[page].id)}]"`
      )
      .replace(
        `'${page}'`,
        `'[resource:${String(siteId)}:${String(resourcesMap[page].id)}]'`
      )
      .replace(
        `'${page}/'`,
        `'[resource:${String(siteId)}:${String(resourcesMap[page].id)}]'`
      );
  }

  return newContent;
}

main().catch((err) => console.error(err));

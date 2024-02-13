const fs = require("fs-extra");
const path = require("path");
const matter = require("gray-matter");
const glob = require("glob-promise");

// Function to encode content to Base64
const encodeBase64 = (content) => Buffer.from(content).toString("base64");

// Function to process markdown files
const processMarkdownFile = async (filePath, basePathDestination) => {
  const content = await fs.readFile(filePath, "utf8");
  const parsed = matter(content);
  const base64Content = encodeBase64(parsed.content);
  const permalink = parsed.data.permalink.replace(/^\//, "").replace(/\/$/, "");
  const destinationDir = path.join(basePathDestination, "src/pages", permalink);
  await fs.ensureDir(destinationDir);

  const schemaDestinationDir = path.join(
    basePathDestination,
    "src/schema",
    permalink
  );
  await fs.ensureDir(schemaDestinationDir);

  // Write .json file
  const schemaFilePath = path.join(schemaDestinationDir, "schema.json");
  const schemaContent = `
  {
    "id": "ContentPage",
    "permalink": "${parsed.data.permalink}",
    "layout": "content",
    "title": "${parsed.data.title}",
    "components": [
      {
        "id": "Content",
        "sectionIdx": 1,
        "props": {
          "markdown": "${base64Content}"
        },
        "indexable": ["props.markdown"]
      }
    ],
    "indexable": ["title"]
  }`;
  await fs.writeFile(schemaFilePath, schemaContent);
  console.log("Schema file written to " + schemaFilePath);

  // Write .ts file
  const schemaTsFilePath = path.join(schemaDestinationDir, "schema.ts");
  const schemaTsContent = `
    import schemaJson from "./schema.json"
    export const schema = schemaJson`;

  await fs.writeFile(schemaTsFilePath, schemaTsContent);
  console.log("Schema TS file written to " + schemaTsFilePath);

  // Write index.tsx file
  const indexFilePath = path.join(destinationDir, "index.tsx");
  const indexContent = `import { RenderEngine } from "@isomerpages/isomer-components";
  import { schema } from "@/schema/${permalink}/schema";
  import * as Config from "@/config"
  import sitemap from "@/sitemap.json"
  import Link from "next/link"
  
  export default function Page() {
    const renderSchema = schema;
    return (
      <RenderEngine
          id={renderSchema.id}
          layout={renderSchema.layout}
          config={{navbar: Config.Navbar, footer: Config.Footer}}
          sitemap={sitemap}
          permalink={renderSchema.permalink}
          components={renderSchema.components}
          LinkComponent={Link}
      />
    );
  }`;
  await fs.writeFile(indexFilePath, indexContent);
  console.log("Index file written to " + indexFilePath);
};

// New function to process any subdirectories and .md files within them
const processSubdirectories = async (dir, basePathDestination) => {
  console.log(`Processing subdirectories in: ${dir}`);
  // This pattern matches all .md files in the directory and its subdirectories
  const files = await glob(path.join(dir, "**/*.md"));

  for (const file of files) {
    console.log(`Found md file: ${file}`);
    await processMarkdownFile(file, basePathDestination);
  }
};

// Function to process the 'pages' directory
const processPagesFolder = async (baseDir, basePathDestination) => {
  const pagesDir = path.join(baseDir, "pages");
  console.log(`Processing 'pages' directory: ${pagesDir}`);
  await processSubdirectories(pagesDir, basePathDestination);
};

// Adjusted function to process directories starting with `_` at the first level
const processDirectories = async (baseDir, basePathDestination) => {
  console.log(`Processing first-level directories in: ${baseDir}`);
  // Matches only directories starting with `_` directly under baseDir
  const dirs = await glob(path.join(baseDir, "_*/"), { nodir: false });

  for (const dir of dirs) {
    console.log(`Found dir: ${dir}`);
    await processSubdirectories(dir, basePathDestination);
  }

  // Additionally process the 'pages' folder
  await processPagesFolder(baseDir, basePathDestination);
};

module.exports = { processDirectories };

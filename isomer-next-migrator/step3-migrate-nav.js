const fs = require("fs-extra");
const path = require("path");
const yaml = require("js-yaml");
const matter = require("gray-matter");

// Reads and parses a markdown file to extract front matter
const parseMarkdownFile = async (filePath) => {
  const content = await fs.readFile(filePath, "utf8");
  return matter(content);
};

// Reads and parses collection.yml to get the order of items
const parseCollectionOrder = async (collectionPath) => {
  const filePath = path.join(collectionPath, "collection.yml");
  const content = await fs.readFile(filePath, "utf8");
  return yaml.load(content);
};

// Processes a single collection
const processCollection = async (collectionName, basePathSource) => {
  const collectionDir = path.join(basePathSource, `_${collectionName}`);
  const collectionConfig = await parseCollectionOrder(collectionDir);
  const links = [];
  const processedSections = new Set(); // Tracks sections that have been processed

  for (const item of collectionConfig.collections[collectionName].order) {
    if (item.endsWith(".keep")) {
      continue; // Skip .keep files
    }

    const itemPath = path.join(collectionDir, item);
    const sectionName = item.split("/")[0]; // Extract section name from the path

    // Check if this section has already been processed
    if (processedSections.has(sectionName)) {
      continue; // Skip this item if its section has been processed
    }

    processedSections.add(sectionName); // Mark this section as processed

    // Proceed with parsing the markdown file
    const parsedMd = await parseMarkdownFile(itemPath);
    const title =
      parsedMd.data.third_nav_title || path.basename(item, path.extname(item));
    const permalink = parsedMd.data.permalink;

    links.push({
      type: "single",
      name: title,
      url: permalink,
    });
  }

  return {
    type: "dropdown",
    name: collectionName.replace(/-/g, " "),
    eventKey: collectionName,
    links,
  };
};

// Main function to process navigation.yml and construct navbar.ts
const processNavigation = async (basePathSource, basePathDestination) => {
  const navPath = path.join(basePathSource, "_data", "navigation.yml");
  const navData = yaml.load(await fs.readFile(navPath, "utf8"));
  const links = [];

  for (const link of navData.links) {
    if (link.collection) {
      const dropdown = await processCollection(link.collection, basePathSource);
      dropdown.name = link.title; // Use the title from navigation.yml
      links.push(dropdown);
    } else {
      links.push({
        type: "single",
        name: link.title,
        eventKey: link.url.substring(1).replace(/\//g, "-"), // Derive eventKey from url
        url: link.url,
      });
    }
  }

  const navbarConfig = `export const Navbar = {
    id: "Navbar",
    components: [
      {
        id: "Navbar",
        props: {
          logo: {
            url: "https://www.isomer.gov.sg${navData.logo}",
            alt: "Isomer logo",
          },
          links: ${JSON.stringify(links, null, 2)},
          search: {
            isEnabled: true,
            "searchUrl": "/search"
          },
        },
      },
    ],
  };
  `;

  const destFilePath = path.join(
    basePathDestination,
    "src",
    "config",
    "navbar.ts"
  );
  await fs.ensureDir(path.dirname(destFilePath));
  await fs.writeFile(destFilePath, navbarConfig);
  console.log(`Navbar config written to ${destFilePath}`);
};

module.exports = { processNavigation };

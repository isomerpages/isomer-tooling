const fs = require("fs-extra");
const path = require("path");
const matter = require("gray-matter");
const glob = require("glob-promise");
const { copyDirectories } = require("./step1-copy-media");
const { processDirectories } = require("./step2-migrate-content");
const { processNavigation } = require("./step3-migrate-nav");

// Define base source and destination paths
const basePathSource = path.join("");
const basePathDestination = path.join("");

const startMigration = async () => {
  try {
    // Copy media files + images
    await copyDirectories()
      .then(() => console.log("Copying of media dirs completed."))
      .catch((err) => console.error("Copying of media dirs failed:", err));

    // Migrate content files
    await processDirectories(basePathSource, basePathDestination)
      .then(() => console.log("Migration of content files completed."))
      .catch((err) => console.error("Migration of content files failed:", err));

    // Migrate nav
    await processNavigation(basePathSource, basePathDestination)
      .then(() => console.log("Migration of nav completed."))
      .catch((err) => console.error("Migration of nav failed:", err));
  } catch (e) {
    console.error(e);
  }
};

startMigration();

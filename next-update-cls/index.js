const { Client } = require("pg");
const Papa = require("papaparse");
const fs = require("fs").promises;
const path = require("path");
const moment = require("moment");
const dotenv = require("dotenv");
const yesno = require("yesno");
const { getArticleSchema, getLinkSchema } = require("./utils");
const { exec } = require("child_process");
const crypto = require("crypto");

// Configuration settings: unlikely that you will need to modify these
// AWS Profile to use when uploading the images to S3
const AWS_PROFILE = "isomer-production";

// This is the path to the CSV file that contains all active CLS items
const CLS_ACTIVE_ITEMS_CSV_PATH = "cls-active-items.csv";

// This is the path to the CSV file that contains all archived CLS items
const CLS_ARCHIVED_ITEMS_CSV_PATH = "cls-archived-items.csv";

// This is the resource ID for the root level folder that contains the
// actual CLS items (the permalink is /cls-items)
const CLS_ARTICLES_FOLDER_RESOURCE_ID = 33295;

// This is the resource ID for the collection of links to the active CLS items
const CLS_ACTIVE_LINKS_COLLECTION_RESOURCE_ID = 34471;

// This is the resource ID for the collection of links to the archived CLS items
const CLS_ARCHIVED_LINKS_COLLECTION_RESOURCE_ID = 34913;

// This is the site ID for the CSA website on Studio
const CSA_SITE_ID = 36;

// This is the name of the S3 bucket to upload the assets to
const S3_BUCKET_NAME = "isomer-next-infra-prod-assets-private-a319984";

// DO NOT TOUCH BELOW THIS LINE
dotenv.config();

const RESOURCE_DB_QUERY = `SELECT "Resource".id, "Resource".permalink
FROM "Resource"
WHERE "Resource"."parentId" = $1`;

const main = async () => {
  // Step 1: Parse the CSV files
  const activeItemsCsv = await fs.readFile(CLS_ACTIVE_ITEMS_CSV_PATH, "utf-8");
  const archivedItemsCsv = await fs.readFile(
    CLS_ARCHIVED_ITEMS_CSV_PATH,
    "utf-8"
  );

  const activeItems = Papa.parse(activeItemsCsv, { header: true });
  const archivedItems = Papa.parse(archivedItemsCsv, { header: true });

  // Step 2: Retrieve the state of the current CLS items from the database
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    console.log("Connected to the database");

    const allClsArticles = await client.query(RESOURCE_DB_QUERY, [
      CLS_ARTICLES_FOLDER_RESOURCE_ID,
    ]);
    const allClsActiveLinks = await client.query(RESOURCE_DB_QUERY, [
      CLS_ACTIVE_LINKS_COLLECTION_RESOURCE_ID,
    ]);
    const allClsArchivedLinks = await client.query(RESOURCE_DB_QUERY, [
      CLS_ARCHIVED_LINKS_COLLECTION_RESOURCE_ID,
    ]);

    // Step 3: Find all items that are no longer active and move them to the archive
    // NOTE: We are using the "Shortlink" field, as that contains the permalink we need
    const csvArchivedItems = archivedItems.data.map((item) =>
      item["Shortlink"].replace("https://www.csa.gov.sg/", "")
    );

    const dbActiveItems = allClsArticles.rows.map((item) => item.permalink);
    const itemsToArchive = dbActiveItems.filter(
      (item) => !csvArchivedItems.includes(item)
    );

    // Step 3a: Move items to the archive
    await client.query(
      `UPDATE "Resource" SET "Resource"."parentId" = $1 WHERE "Resource".permalink IN ($2)`,
      [CLS_ARCHIVED_LINKS_COLLECTION_RESOURCE_ID, itemsToArchive]
    );

    // Step 4: Find all new CLS items and create the article resources + upload the product and label images
    const csvActiveItems = activeItems.data.map((item) =>
      item["Shortlink"].replace("https://www.csa.gov.sg/", "")
    );
    const itemsToCreate = csvActiveItems.filter(
      (item) => !dbActiveItems.includes(item)
    );

    // Step 4a: Find the items to create and notify the user to prepare the images
    const itemsToCreateCsv = activeItems.data.filter((item) =>
      itemsToCreate.includes(
        item["Shortlink"].replace("https://www.csa.gov.sg/", "")
      )
    );
    const productImages = itemsToCreateCsv.map(
      (item) => item["Product Image Filename"]
    );
    const labelImages = itemsToCreateCsv.map(
      (item) => item["Label Image Filename"]
    );

    console.log("Please obtain the following files from the Google Drive:");
    console.log(
      'Product Images (put inside "product" folder): ',
      productImages.join(", ")
    );
    console.log(
      'Label Images (put inside "label" folder): ',
      labelImages.join(", ")
    );

    // Wait for user to confirm
    let ok = false;

    while (!ok) {
      ok = await yesno({
        question: "Have you placed all the images in the correct folders?",
      });
    }

    for (const item of itemsToCreate) {
      // Step 4a: Create the new CLS article resources and collection links
      // Find the corresponding row in the CSV file
      const csvRow = activeItems.data.find(
        (row) =>
          row["Shortlink"].replace("https://www.csa.gov.sg/", "") === item
      );
      const category = csvRow["Product Category"];
      const brand = csvRow["Brand"];
      const model = csvRow["Model"];
      const clsLevel = csvRow["CLS Level Issued"];
      const registrationId = csvRow["CLS Label ID"];
      const issuanceDate = moment(csvRow["Date of Issue"], "D-MMM-YY").toDate();
      const expirationDate = moment(
        csvRow["Date of Expiry"],
        "D-MMM-YY"
      ).toDate();
      const website = csvRow["Product URL"];
      const vdp = csvRow["Vulnerability Disclosure Policy"];
      const support = csvRow["Support Period"];
      const product = csvRow["Product"];
      const title = `${brand} ${model}`;

      const productImage = csvRow["Product Image Filename"];
      const labelImage = csvRow["Label Image Filename"];

      // Upload the product and label images to S3
      const productUuid = crypto.randomUUID();
      const labelUuid = crypto.randomUUID();
      exec(
        `AWS_PROFILE=${AWS_PROFILE} aws s3 cp ${path.join(
          "product",
          productImage
        )} s3://${S3_BUCKET_NAME}/${productUuid}/${productImage}`
      );
      exec(
        `AWS_PROFILE=${AWS_PROFILE} aws s3 cp ${path.join(
          "label",
          labelImage
        )} s3://${S3_BUCKET_NAME}/${labelUuid}/${labelImage}`
      );

      const productImageUrl = `/${CSA_SITE_ID}/${productUuid}/${productImage}`;
      const labelImageUrl = `/${CSA_SITE_ID}/${labelUuid}/${labelImage}`;

      // Step 4b: Create the article blob
      const articleContent = getArticleSchema({
        category,
        brand,
        model,
        clsLevel,
        registrationId,
        issuanceDate,
        expirationDate,
        website,
        vdp,
        support,
        productImage: productImageUrl,
        labelImage: labelImageUrl,
      });

      // Create the new blob
      const articleId = await client.query(
        `INSERT INTO "Blob" (content) VALUES ($1) RETURNING id`,
        [articleContent]
      );

      // Create the new resource
      const newResource = await client.query(
        `INSERT INTO "Resource" (permalink, "siteId", parentId, title, "draftBlobId", state, type, "publishedVersionId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          item,
          CSA_SITE_ID,
          CLS_ARTICLES_FOLDER_RESOURCE_ID,
          title,
          null,
          "Published",
          "CollectionPage",
          null, // This will be updated later
          new Date(),
          new Date(),
        ]
      );

      // Create the new version
      const newVersion = await client.query(
        `INSERT INTO "Version" ("blobId", "versionNum", "resourceId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          articleId.rows[0].id,
          1,
          newResource.rows[0].id,
          new Date(),
          new Date(),
        ]
      );

      // Update the resource with the new version
      await client.query(
        `UPDATE "Resource" SET "publishedVersionId" = $1 WHERE id = $2`,
        [newVersion.rows[0].id, newResource.rows[0].id]
      );

      // Step 4c: Create the corresponding collection links that point to the new CLS article resources
      const linkContent = getLinkSchema({
        articleId: newResource.rows[0].id,
        category,
        brand,
        model,
        clsLevel,
        product,
        issuanceDate,
        expirationDate,
        productImage: productImageUrl,
        siteId: CSA_SITE_ID,
      });

      // Create the new blob
      const linkId = await client.query(
        `INSERT INTO "Blob" (content) VALUES ($1) RETURNING id`,
        [linkContent]
      );

      // Create the new resource
      const newLinkResource = await client.query(
        `INSERT INTO "Resource" (permalink, "siteId", parentId, title, "draftBlobId", state, type, "publishedVersionId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          item,
          CSA_SITE_ID,
          CLS_ACTIVE_LINKS_COLLECTION_RESOURCE_ID,
          title,
          null,
          "Published",
          "CollectionLink",
          null, // This will be updated later
          new Date(),
          new Date(),
        ]
      );

      // Create the new version
      const newLinkVersion = await client.query(
        `INSERT INTO "Version" ("blobId", "versionNum", "resourceId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [
          linkId.rows[0].id,
          1,
          newLinkResource.rows[0].id,
          new Date(),
          new Date(),
        ]
      );

      // Update the resource with the new version
      await client.query(
        `UPDATE "Resource" SET "publishedVersionId" = $1 WHERE id = $2`,
        [newLinkVersion.rows[0].id, newLinkResource.rows[0].id]
      );
    }

    // Step 6: Generate the redirection mappings to be created for the new CLS items
    const csvReport = itemsToCreate.map((item) => {
      return `www.csa.gov.sg,/${item},/cls-items/${item}`;
    });
    const csvHeaders = "Domain,Sources,Target\n";
    await fs.writeFile(
      "cls-redirection-mappings.csv",
      csvHeaders + csvReport.join("\n")
    );

    console.log(
      "Redirection mappings have been generated at cls-redirection-mappings.csv"
    );
    console.log("Please add these redirects and perform a pulumi up");
  } catch (e) {
    console.error("An error occurred");
    throw e;
  } finally {
    await client.end();
  }
};

main().catch((err) => console.error(err));

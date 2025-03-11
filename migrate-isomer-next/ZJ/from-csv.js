// Script for creating the JSON schema files using the CSV file with defined fields
const Papa = require("papaparse");
const fs = require("fs").promises;
const {
  convertHtmlToSchema,
  getIsHtmlContainingRedundantDivs,
} = require("./convert-tiptap");
const path = require("path");

// CONFIGURATION SETTINGS
const CSV_FILE = "input.csv";
const DESTINATION_URL_PREFIX =
  "https://staging.d306f57gw0yhi9.amplifyapp.com/others/resources-and-statistics";

const main = async () => {
  const reportItems = [];

  // Step 0: Create the output directory. If it exists, delete it first
  try {
    await fs.rm("output", { recursive: true });
  } catch (error) {
    // Ignore error if directory doesn't exist
  }

  await fs.mkdir("output");

  // Step 1: Read the CSV file
  const csv = await fs.readFile(CSV_FILE, "utf-8");

  // Step 2: Parse the CSV files
  const csvParse = Papa.parse(csv, { header: true });

  // Step 3: Iterate through all the rows in the CSV file and convert the page
  // contents into the Isomer JSON schema
  for (const row of csvParse.data) {
    const title = row["Page name"];
    const category = row["Category"];
    const publishDate = row["Published date"];

    const originalSlug = row["Page link"].replace(
      "https://www.moh.gov.sg/resources-statistics/",
      ""
    );
    const fileName = originalSlug.replaceAll("/", "-");

    const html = row["HTML"];

    // const isHtmlContainingRedundantDivs =
    //   getIsHtmlContainingRedundantDivs(html);

    // if (html.includes("<div") && !isHtmlContainingRedundantDivs) {
    //   // Skip if html contains any div or span tags that contain attributes
    //   // that can have visual impact
    //   reportItems.push({
    //     title: typeof title === "string" ? title.replaceAll('"', '""') : title,
    //     url: row["Page link"],
    //     newUrl: `${DESTINATION_URL_PREFIX}/${fileName}`,
    //     publishDate,
    //     status: "Skipped",
    //     remarks: "HTML contains div tags",
    //   });
    //   continue;
    // } else if (html.includes("<div") && isHtmlContainingRedundantDivs) {
    //   reportItems.push({
    //     title: typeof title === "string" ? title.replaceAll('"', '""') : title,
    //     url: row["Page link"],
    //     newUrl: `${DESTINATION_URL_PREFIX}/${fileName}`,
    //     publishDate,
    //     status: "Migrated",
    //     remarks: "HTML contained redundant div tags that were removed",
    //   });
    // } else
    if (html.includes("<iframe")) {
      reportItems.push({
        title: typeof title === "string" ? title.replaceAll('"', '""') : title,
        url: row["Page link"],
        newUrl: `${DESTINATION_URL_PREFIX}/${fileName}`,
        publishDate,
        status: "Migrated",
        remarks: "HTML contains iframe tags",
      });
    } else if (html.includes("<img ")) {
      reportItems.push({
        title: typeof title === "string" ? title.replaceAll('"', '""') : title,
        url: row["Page link"],
        newUrl: `${DESTINATION_URL_PREFIX}/${fileName}`,
        publishDate,
        status: "Needs review",
        remarks: "HTML contains img tags",
      });
    } else {
      reportItems.push({
        title: typeof title === "string" ? title.replaceAll('"', '""') : title,
        url: row["Page link"],
        newUrl: `${DESTINATION_URL_PREFIX}/${fileName}`,
        publishDate,
        status: "Migrated",
        remarks: "",
      });
    }

    const schema = convertHtmlToSchema(title, publishDate, category, html);

    // Save schema to file
    await fs.writeFile(
      `output/${fileName}.json`,
      JSON.stringify(schema, null, 2)
    );
  }

  // Step 4: Save the report to a file
  const csvReport = reportItems.map((item, index) => {
    return `${index + 1},"${item.title}","${item.url}","${item.newUrl}","${
      item.publishDate
    }","${item.status}","${item.remarks}"`;
  });
  const csvHeaders =
    "No.,Title,Original URL,Staging URL,Publish Date,Status,Remarks\n";
  await fs.writeFile(
    "csv-migration-results.csv",
    csvHeaders + csvReport.join("\n")
  );
};

main();
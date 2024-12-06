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
  "https://staging.d233tvufevio3n.amplifyapp.com/interviews";

const EXCLUDED_PAGES = [];

const main = async () => {
  const reportItems = [];

  // Step 0: Create the output directory. If it exists, delete it first
  try {
    await fs.rm("output", { recursive: true });
  } catch (error) {
    // Ignore error if directory doesn't exist
  }

  await fs.mkdir("output");

  // try {
  //   await fs.rm("output-link", { recursive: true });
  // } catch (error) {
  //   // Ignore error if directory doesn't exist
  // }

  // await fs.mkdir("output-link");

  // Step 1: Read the CSV file
  const csv = await fs.readFile(CSV_FILE, "utf-8");

  // Step 2: Parse the CSV files
  const csvParse = Papa.parse(csv, { header: true });

  // const data = csvParse.data.map((row) => row["URL"]);

  // Step 3: Iterate through all the rows in the CSV file and convert the page
  // contents into the Isomer JSON schema
  for (const row of csvParse.data) {
    // console.log();
    // console.log();
    // console.log(row["Permalink"]);
    const originalUrl = row["URL"];
    const title = row["Title"].replace("gov.sg | ", "");
    const publishDate = row["Date"];
    const fileName = originalUrl.split("/").pop().toLocaleLowerCase();
    // const category = row["Category"];
    const html = row["HTML"];

    const imageHtml = row["bannerImage"];
    const rawCategory = row["Category"].replaceAll("'", '"');
    const category = JSON.parse(rawCategory)
      .sort((a, b) => a.localeCompare(b))
      .join(", ");

    // if (data.filter((item) => item === originalUrl).length > 1) {
    //   console.log("Duplicate URL: ", originalUrl);
    // }

    // const originalUrl = row["URL"];
    // const slug = originalUrl.split("/").pop();

    // const items = row["HTML"].slice(1, -1);
    // .replaceAll("🕒 ", "")
    // .replaceAll(" ⟶", "")
    // .split('</div>, <div class="row">')
    // .map((item) => `<div class="row">${item}</div>`);
    // const html = items;

    // const html = header + content + pdf;

    // const isHtmlContainingRedundantDivs =
    //   getIsHtmlContainingRedundantDivs(html);

    // if (html.includes("<div") && !isHtmlContainingRedundantDivs) {
    //   // Skip if html contains any div or span tags that contain attributes
    //   // that can have visual impact
    //   reportItems.push({
    //     title: typeof title === "string" ? title.replaceAll('"', '""') : title,
    //     url: originalUrl,
    //     newUrl: `${DESTINATION_URL_PREFIX}/${fileName}`,
    //     publishDate,
    //     status: "Skipped",
    //     remarks: "HTML contains div tags",
    //   });
    //   continue;
    // } else
    if (EXCLUDED_PAGES.includes(fileName)) {
      reportItems.push({
        title: typeof title === "string" ? title.replaceAll('"', '""') : title,
        url: originalUrl,
        newUrl: `${DESTINATION_URL_PREFIX}/${fileName}`,
        publishDate,
        status: "Skipped",
        remarks: "The page was explicitly excluded from migration",
      });
      continue;
      // } else if (html.includes("<iframe")) {
      //   reportItems.push({
      //     title: typeof title === "string" ? title.replaceAll('"', '""') : title,
      //     url: originalUrl,
      //     newUrl: `${DESTINATION_URL_PREFIX}/${fileName}`,
      //     publishDate,
      //     status: "Migrated",
      //     remarks: "HTML contains iframe tags",
      //   });
      // } else if (html.includes("<img ")) {
      //   reportItems.push({
      //     title: typeof title === "string" ? title.replaceAll('"', '""') : title,
      //     url: originalUrl,
      //     newUrl: `${DESTINATION_URL_PREFIX}/${fileName}`,
      //     publishDate,
      //     status: "Needs review",
      //     remarks: "HTML contains img tags",
      //   });
    } else {
      reportItems.push({
        title: typeof title === "string" ? title.replaceAll('"', '""') : title,
        url: originalUrl,
        newUrl: `${DESTINATION_URL_PREFIX}/${fileName}`,
        publishDate,
        status: "Migrated",
        remarks: "",
      });
    }

    // const contentItems = await Promise.all(
    //   items.map((item) => convertHtmlToSchema(item, fileName))
    // );
    // const contentItems = await convertHtmlToSchema(html, fileName).then(
    //   (res) => [res]
    // );

    const imageItems = await convertHtmlToSchema(imageHtml, fileName);
    const contentItems = await convertHtmlToSchema(html, fileName);

    if (contentItems.length === 0) {
      console.log("No content items: ", fileName);
    }

    const schema = {
      version: "0.1.0",
      layout: "article",
      page: {
        title: title.toString(),
        category,
        date: publishDate,
        articlePageHeader: {
          summary: "",
        },
      },
      content: [
        // {
        //   type: "callout",
        //   content: {
        //     type: "prose",
        //     content: [
        //       {
        //         type: "paragraph",
        //         content: [
        //           {
        //             type: "text",
        //             text: "This article has been migrated from an earlier version of the site and may display formatting inconsistencies.",
        //           },
        //         ],
        //       },
        //     ],
        //   },
        // },
        ...imageItems,
        ...contentItems,
      ],
    };

    // const linkSchema = {
    //   version: "0.1.0",
    //   layout: "link",
    //   page: {
    //     title: title.toString(),
    //     ref: `/latest-happenings/public-consultation-pages/${slug}`,
    //     category,
    //     date: publishDate,
    //     image: {
    //       src: headerItems.find((item) => item.type === "image")?.src,
    //       alt: `${category} logo`,
    //     },
    //   },
    //   content: [],
    // };

    // Save schema to file
    await fs.writeFile(
      `output/${fileName}.json`,
      JSON.stringify(schema, null, 2)
    );
    // await fs.writeFile(
    //   `output-link/${fileName}.json`,
    //   JSON.stringify(linkSchema, null, 2)
    // );
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

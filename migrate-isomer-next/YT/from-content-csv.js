// Script for creating the JSON schema files using the CSV file with defined fields
const Papa = require("papaparse");
const fs = require("fs").promises;
const { convertHtmlToSchema } = require("./convert-tiptap");
const path = require("path");
const moment = require("moment");

// CONFIGURATION SETTINGS
// This is the CSV file that contains the HTML content of the pages, one page per row
const CSV_FILE = "./csv/test-list.csv";
// This is the list of pages that should be excluded from migration
// This should match the identifier that you are using for each page, usually
// the permalink (or termed as "fileName" in this script)
const EXCLUDED_PAGES = [];

const main = async () => {
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
    try {
      // const originalUrl = row["URL"];
      const title = row["Title"];
      const publishDate = moment(row["Date"], "D MMM YYYY").format("DD/MM/YYYY");
      const fileName = row["JSON File name"].replace("_", "-") // row["Link"].split("/")[row["Link"].split("/").length - 1].toLowerCase().replaceAll("'", "-"); 
      // row["JSON File name"] = fileName;
        // .replaceAll("https://www.ace-hta.gov.sg/healthcare-professionals/ace-clinical-guidances-(acgs)/details", "")
        // .replaceAll("/", "");
      const category = row["Category"];
      const html = row["HTML"];

      // const fileExt = row["Link"].split(".").pop();
      // const imageName = row["Image name"] + "." + fileExt;

      // const rawCategory = row["Category"].replaceAll("'", '"');
      const originalUrl = "";

      // const collaborators = row["Collaborators"];

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

      // if (EXCLUDED_PAGES.includes(fileName) || html === "None") {
      //   // Skip pages that are explicitly excluded from migration, or if the html
      //   // provided is "None"
      //   continue;
      // }

      // const contentItems = await Promise.all(
      //   items.map((item) => convertHtmlToSchema(item, fileName))
      // );
      // const contentItems = await convertHtmlToSchema(html, fileName).then(
      //   (res) => [res]
      // );
      console.log(fileName);
      const contentItems = await convertHtmlToSchema(html, fileName);
      // const collaboratorsHtml = `<h2>Collaborators</h2><ol>${collaborators
      //   .split(";")
      //   .map((item) => `<li>${item}</li>`)
      //   .join("")}</ol>`;
      // const collaboratorItems = await convertHtmlToSchema(
      //   collaboratorsHtml,
      //   fileName
      // );

      const schema = {
        version: "0.1.0",
        layout: "article",
        page: {
          title: title,
          category: category,
          // tags: [
          //   {
          //     category: "Country",
          //     selected: row["Country"]
          //   }
          // ],
          // tags: [
          //   {
          //     category: "Campus",
          //     selected: row["CampusLocations"] ? row["CampusLocations"].split(",") : ["Not applicable"]
          //   },
          //   {
          //     category: "Industry",
          //     selected: row["Industries"] ? row["Industries"].split(",") : ["Not applicable"]
          //   },
          //   {
          //     category: "Course type",
          //     selected: row["CourseTypes"].split(",")
          //   },
          //   {
          //     category: "Certifications",
          //     selected: row["Certifications"] ? [row["Certifications"]] : ["Not applicable"]
          //   },
          //   {
          //     category: "Course duration",
          //     selected: row["DurationHours"] 
          //                 ? [row["DurationHours"] + " Hours" ]
          //                 : row["DurationHoursDecimal"] 
          //                 ? [row["DurationHoursDecimal"] + " Hours"]
          //                 : row["Duration"] 
          //                 ? [row["Duration"] + " Months"]
          //                 : ["Not applicable"]
          //   }
          // ],
          date: publishDate,
          articlePageHeader: {
            // summary: `No. of Vacancies: ${vacancies}`,
            summary: ""
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
          ...contentItems,
          // ...collaboratorItems,
        ],
      };

      // MINDEF
      // if (fileName.length > 246) {
      //   row.Comments = fileName.length > 246 ? "File name truncated" : "";
      //   console.log(`${fileName} exceeded 246 chars`)
      //   console.log(`Renamed to ${fileName.slice(0, 247)}`);
      // }
      
      // Save schema to file
      try {
        // Try to access the file. If it exists, this call succeeds.
        await fs.access(`output/${fileName}.json`);
        await fs.writeFile(
          `output/${fileName}-1.json`,
          JSON.stringify(schema, null, 2)
        );
      } catch (error) {
        // If the file does not exist, fs.access will throw an error.
        await fs.writeFile(
          `output/${fileName}.json`,
          JSON.stringify(schema, null, 2)
        );
        row["Comments"] = "Manual migration required";
      }
      row["Comments"] = "";
    } catch (error) {
      row["Comments"] = "Manual migration required";
      console.log(error);
      // console.log(row);
      console.log(row["JSON File name"], "Manual migration required");
    }
  }
  // MINDEF
  const updatedCsv = Papa.unparse(csvParse.data);
  await fs.writeFile("mti-speeches-manual-comments.csv", updatedCsv, 'utf8');
};

main();

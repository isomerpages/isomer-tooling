const fs = require("fs").promises;
const { XMLParser } = require("fast-xml-parser");
const jsdom = require("jsdom");
const { convertHtmlToSchema } = require("./convert-tiptap");

// CONFIGURATION SETTINGS
const XML_FILE = "moh-corp-pressroom.xml";
const ORIGIN_URL_PREFIX = "https://www.moh.gov.sg/news-highlights/details/";
const DESTINATION_URL_PREFIX =
  "https://staging.d306f57gw0yhi9.amplifyapp.com/news-highlights/";
const EXCLUSION_LIST = [
  "cpf-interest-rates-from-1-january-2023-to-31-march-2023-and-basic-healthcare-sum-for-2023",
  "speech-by-dr-amy-khor-senior-minister-of-state-ministry-of-health-at-the-inauguration-of-smart-elderly-care-at-home-centre-tüv-süd-27-oct-2017",
  "答复-卫生部将加强照顾老年人服务",
  "令人担忧的医疗系统",
  "四十而不惑",
  "老者安之",
  "hiv-update-for-world-aids-day-2011",
  "speech-by-parliamentary-secretary-for-health-a-professor-muhammad-faishal-ibrahim-at-the-nestlé-omega-plus-acticol-'love-your-heart'-campaign-launch-4-may-2013",
  "upper-bukit-timah",
];

const { JSDOM } = jsdom;
const dom = new JSDOM(
  `<html>
      <div class="element"></div>
    </html>`
);
const window = dom.window;
const document = window.document;
global.document = document;
global.window = window;

const getIsHtmlContainingRedundantDivs = (html) => {
  const dom = new JSDOM(html);
  const subDoc = dom.window.document;
  const divs = subDoc.querySelectorAll("div");

  return Array.from(divs).some((div) => {
    // Check if the div is empty or contains only whitespace
    if (!div.hasChildNodes() || div.textContent.trim() === "") {
      return true;
    }

    // Check if the div has no attributes
    if (div.attributes.length === 0) {
      return true;
    }

    // Check for specific attributes that might affect rendering
    const impactAttributes = [
      "style",
      "class",
      "onclick",
      "onmouseover",
      "onmouseout",
    ];

    for (let attr of div.attributes) {
      if (impactAttributes.includes(attr.name)) {
        return false;
      }
    }

    // If none of the checks above indicated an impact, the div is redundant
    return true;
  });
};

const getArticleCategory = (title, html) => {
  const htmlLower = html.toLowerCase();
  const titleLower =
    typeof title === "string" ? title.toLowerCase() : title.toString();

  if (
    htmlLower.includes("for the sitting of parliament ") ||
    htmlLower.includes("name and constituency of member of parliament")
  ) {
    return "Parliamentary QA";
  } else if (
    (titleLower.includes("speech ") ||
      titleLower.includes("remarks ") ||
      titleLower.includes("address ") ||
      htmlLower.includes("ladies and gentlemen")) &&
    titleLower.includes(" by ")
  ) {
    return "Speeches";
  } else if (htmlLower.includes("we thank") && htmlLower.includes(" letter")) {
    return "Forum Replies";
  } else {
    return "Press Releases";
  }
};

const main = async () => {
  const reportItems = [];

  // Step 0: Create the output directory if it doesn't exist, otherwise skip
  try {
    await fs.mkdir("output");
  } catch (error) {
    if (error.code !== "EEXIST") {
      throw error;
    }
  }

  // Step 1: Read XML file
  const xml = await fs.readFile(XML_FILE, "utf8");

  // Step 2: Parse XML to JSON
  const parser = new XMLParser({ ignoreAttributes: false });
  const jObj = parser.parse(xml);

  await Promise.all(
    jObj["atom:entry"]["cmisra:object"]
      .slice(0, 7265)
      .map((item) => {
        // Step 3: Extract data from JSON and extract properties from items
        const properties = item["cmis:properties"];

        const title = properties["cmis:propertyString"].find(
          (property) => property["@_propertyDefinitionId"] === "sf:Title"
        )["cmis:value"];

        const url = properties["cmis:propertyString"].find(
          (property) => property["@_propertyDefinitionId"] === "sf:UrlName"
        )["cmis:value"];

        const newUrl = url
          .toString()
          .replaceAll(".", "")
          .replaceAll("!", "")
          .replaceAll("@", "at")
          .slice(0, 250);

        const publishDate = properties["cmis:propertyDateTime"]["cmis:value"];

        const html = properties["cmis:propertyString"].find(
          (property) => property["@_propertyDefinitionId"] === "sf:MainContent"
        )["cmis:value"];

        return {
          title,
          url,
          newUrl,
          publishDate,
          html,
        };
      })
      // .filter(
      //   ({ title, url, newUrl, publishDate, html }) =>
      //     new Date(publishDate) > new Date("2021-01-01")
      // )
      .map(async ({ title, url, newUrl, publishDate, html }) => {
        const isHtmlContainingRedundantDivs =
          getIsHtmlContainingRedundantDivs(html);
        const category = getArticleCategory(title, html);
        const subfolder = category.toLowerCase().replace(" ", "-");

        if (EXCLUSION_LIST.includes(newUrl)) {
          reportItems.push({
            title:
              typeof title === "string" ? title.replaceAll('"', '""') : title,
            url: `${ORIGIN_URL_PREFIX}${url}`,
            newUrl: `${DESTINATION_URL_PREFIX}${subfolder}/${newUrl}`,
            publishDate,
            status: "Skipped",
            remarks: "Excluded from migration",
          });
          return;
        } else if (html.includes("<div") && !isHtmlContainingRedundantDivs) {
          // Skip if html contains any div or span tags that contain attributes
          // that can have visual impact
          reportItems.push({
            title:
              typeof title === "string" ? title.replaceAll('"', '""') : title,
            url: `${ORIGIN_URL_PREFIX}${url}`,
            newUrl: `${DESTINATION_URL_PREFIX}${subfolder}/${newUrl}`,
            publishDate,
            status: "Skipped",
            remarks: "HTML contains div tags",
          });
          return;
        } else if (html.includes("<div") && isHtmlContainingRedundantDivs) {
          reportItems.push({
            title:
              typeof title === "string" ? title.replaceAll('"', '""') : title,
            url: `${ORIGIN_URL_PREFIX}${url}`,
            newUrl: `${DESTINATION_URL_PREFIX}${subfolder}/${newUrl}`,
            publishDate,
            status: "Migrated",
            remarks: "HTML contained redundant div tags that were removed",
          });
        } else if (html.includes("<iframe")) {
          reportItems.push({
            title:
              typeof title === "string" ? title.replaceAll('"', '""') : title,
            url: `${ORIGIN_URL_PREFIX}${url}`,
            newUrl: `${DESTINATION_URL_PREFIX}${subfolder}/${newUrl}`,
            publishDate,
            status: "Migrated",
            remarks: "HTML contains iframe tags",
          });
        } else if (html.includes("<img ")) {
          reportItems.push({
            title:
              typeof title === "string" ? title.replaceAll('"', '""') : title,
            url: `${ORIGIN_URL_PREFIX}${url}`,
            newUrl: `${DESTINATION_URL_PREFIX}${subfolder}/${newUrl}`,
            publishDate,
            status: "Needs review",
            remarks: "HTML contains img tags",
          });
        } else {
          reportItems.push({
            title:
              typeof title === "string" ? title.replaceAll('"', '""') : title,
            url: `${ORIGIN_URL_PREFIX}${url}`,
            newUrl: `${DESTINATION_URL_PREFIX}${subfolder}/${newUrl}`,
            publishDate,
            status: "Migrated",
            remarks: "",
          });
        }

        const schema = await convertHtmlToSchema(
          title,
          publishDate,
          category,
          html
        );

        // Create subfolder if it doesn't exist
        try {
          await fs.mkdir(`output/${subfolder}`);
        } catch (error) {
          if (error.code !== "EEXIST") {
            throw error;
          }
        }

        // Save schema to file
        await fs.writeFile(
          `output/${subfolder}/${newUrl}.json`,
          JSON.stringify(schema, null, 2)
        );
      })
  );

  // Save skipped items as CSV file
  const csv = reportItems.map((item, index) => {
    return `${index + 1},"${item.title}","${item.url}","${item.newUrl}","${
      item.publishDate
    }","${item.status}","${item.remarks}"`;
  });
  const csvHeaders =
    "No.,Title,Original URL,Staging URL,Publish Date,Status,Remarks\n";
  await fs.writeFile("results.csv", csvHeaders + csv.join("\n"));
};

main();

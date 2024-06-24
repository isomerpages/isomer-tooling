const fs = require("fs").promises;
const { XMLParser } = require("fast-xml-parser");
const jsdom = require("jsdom");

const { Bold } = require("@tiptap/extension-bold");
const { BulletList } = require("@tiptap/extension-bullet-list");
const { Document } = require("@tiptap/extension-document");
const { Dropcursor } = require("@tiptap/extension-dropcursor");
const { Gapcursor } = require("@tiptap/extension-gapcursor");
const { HardBreak } = require("@tiptap/extension-hard-break");
const { Heading } = require("@tiptap/extension-heading");
const { History } = require("@tiptap/extension-history");
const { HorizontalRule } = require("@tiptap/extension-horizontal-rule");
const { Image } = require("@tiptap/extension-image");
const { Italic } = require("@tiptap/extension-italic");
const { Link } = require("@tiptap/extension-link");
const { ListItem } = require("@tiptap/extension-list-item");
const { OrderedList } = require("@tiptap/extension-ordered-list");
const { Paragraph } = require("@tiptap/extension-paragraph");
const { Strike } = require("@tiptap/extension-strike");
const { Subscript } = require("@tiptap/extension-subscript");
const { Superscript } = require("@tiptap/extension-superscript");
const { Table } = require("@tiptap/extension-table");
const { TableRow } = require("@tiptap/extension-table-row");
const { TableCell } = require("@tiptap/extension-table-cell");
const { TableHeader } = require("@tiptap/extension-table-header");
const { Text } = require("@tiptap/extension-text");
const { Underline } = require("@tiptap/extension-underline");
const { generateJSON } = require("@tiptap/html");
const { Node } = require("@tiptap/core");

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
    return "Press Release";
  }
};

const convertFromTiptap = (value) => {
  const keys = Object.keys(value);

  if (value.type === "text" && keys.includes("marks")) {
    return {
      type: "text",
      text: value.text,
      marks: value.marks.map((mark) => {
        if (mark.type === "link") {
          return { type: "link", href: mark.attrs.href };
        }

        return { ...mark };
      }),
    };
  }

  if (value.type === "iframe") {
    return {
      type: "iframe",
      title: value.title,
      content: value.content,
    };
  }

  if (!keys.includes("content")) {
    if (keys.includes("attrs")) {
      const { attrs, ...rest } = value;
      return {
        ...rest,
        ...Object.fromEntries(
          Object.keys(attrs).map((key) => {
            if (attrs[key] === null) {
              return [key, ""];
            }

            return [key, attrs[key]];
          })
        ),
      };
    }
    return { ...value };
  }

  const { content, ...rest } = value;

  if (keys.includes("attrs")) {
    const { attrs, ...last } = rest;
    return {
      ...last,
      ...Object.fromEntries(
        Object.keys(attrs)
          .filter((key) => key !== "colwidth" && attrs[key] !== null)
          .map((key) => {
            if (key === "colspan") {
              return ["colSpan", parseInt(attrs[key])];
            }

            if (key === "rowspan") {
              return ["rowSpan", parseInt(attrs[key])];
            }

            return [key, attrs[key]];
          })
      ),
      content: content.map((node) => convertFromTiptap(node)),
    };
  }
  return {
    ...rest,
    content: value.content.map((node) => convertFromTiptap(node)),
  };
};

const getCleanedSchema = (schema) => {
  // Recursively find components with "type": "table" and add a new key "caption"
  // then return the schema
  const findTable = (schema) => {
    schema.forEach((component) => {
      if (component.type === "table") {
        component.caption = "";
      } else if (component.content) {
        findTable(component.content);
      }
    });

    return schema;
  };

  // Recursively find components with "type": "hardBreak" and remove all other attributes
  // then return the schema
  const findHardBreak = (schema) => {
    schema.forEach((component) => {
      if (component.type === "hardBreak") {
        delete component.marks;
      } else if (component.content) {
        findHardBreak(component.content);
      }
    });

    return schema;
  };

  // Recursively find table components and ensure that the first row contains
  // cells that are of type tableHeader, then return the schema
  const findTableHeader = (schema) => {
    schema.forEach((component) => {
      if (component.type === "table") {
        const tableHeader = component.content[0].content;

        if (!tableHeader) {
          return;
        }

        tableHeader.forEach((cell) => {
          cell.type = "tableHeader";
        });
      } else if (component.content) {
        findTableHeader(component.content);
      }
    });

    return schema;
  };

  const findParagraphHardBreak = (schema) => {
    schema.forEach((component, index) => {
      if (component.type === "paragraph" && component.content) {
        const paragraph = component.content;
        const hardBreakIndex = paragraph.findIndex(
          (node, i) =>
            node.type === "hardBreak" && paragraph[i + 1]?.type === "hardBreak"
        );

        if (hardBreakIndex !== -1) {
          const firstParagraph = paragraph.slice(0, hardBreakIndex);
          const secondParagraph = paragraph.slice(hardBreakIndex + 2);

          schema[index].content = firstParagraph;
          schema.splice(index + 1, 0, {
            type: "paragraph",
            content: secondParagraph,
          });

          findParagraphHardBreak(schema);
        }
      } else if (component.content) {
        findParagraphHardBreak(component.content);
      }
    });

    return schema;
  };

  // Recursively find for "type": "paragraph" with no content key, then remove
  // the component from the schema
  const removeEmptyParagraphs = (schema) => {
    return schema.filter((component) => {
      if (
        (component.type === "paragraph" || component.type === "heading") &&
        (!component.content || component.content.length === 0)
      ) {
        return false;
      }

      if (component.content) {
        component.content = removeEmptyParagraphs(component.content);
      }

      return true;
    });
  };

  // Recursively find for "type": "iframe" and convert the attributes into the HTML string,
  // then put the HTML string into the "content" key. Also add the "title" key with an empty string.
  const findIframe = (schema) => {
    schema.forEach((component) => {
      if (component.type === "iframe") {
        const attributes = Object.entries(component.attrs).reduce(
          (acc, [key, value]) => {
            if (value === null) {
              return acc;
            }

            return `${acc} ${key}="${value}"`;
          },
          ""
        );

        delete component.attrs;
        component.content = `<iframe${attributes}></iframe>`;
        component.title = "";
      } else if (component.content) {
        findIframe(component.content);
      }
    });

    return schema;
  };

  return findIframe(
    removeEmptyParagraphs(
      findTableHeader(findHardBreak(findParagraphHardBreak(findTable(schema))))
    )
  );
};

const convertHtmlToSchema = async (title, publishDate, html) => {
  const output = generateJSON(html, [
    // Blockquote,
    Bold,
    BulletList.extend({
      name: "unorderedList",
    }),
    BulletList.configure({
      HTMLAttributes: {
        class: "list-disc",
      },
    }),
    // Code,
    // CodeBlock,
    Document,
    Dropcursor,
    Gapcursor,
    HardBreak,
    Heading,
    History,
    HorizontalRule.extend({
      name: "divider",
    }),
    Image,
    Italic,
    Link,
    ListItem,
    OrderedList.configure({
      HTMLAttributes: {
        class: "list-decimal",
      },
    }),
    Paragraph,
    Strike,
    Superscript,
    Subscript,
    Table.configure({
      resizable: false,
    }),
    TableRow,
    TableHeader,
    TableCell,
    Text,
    Underline.extend({
      parseHTML() {
        return [
          {
            tag: "u",
          },
          {
            style: "text-decoration",
            consuming: false,
            getAttrs: (style) => (style.includes("underline") ? {} : false),
          },
          {
            tag: 'span[style*="text-decoration: underline"]',
            consuming: false,
          },
        ];
      },
    }),
    // Iframe
    Node.create({
      name: "iframe",

      group: "block",
      atom: true,

      draggable: true,

      defining: true,

      addOptions() {
        return {
          allowFullscreen: true,
        };
      },

      addAttributes() {
        return {
          src: {
            default: null,
          },
          title: {
            default: "",
          },
          frameborder: {
            default: 0,
          },
          allowfullscreen: {
            default: this.options.allowFullscreen,
            parseHTML: () => this.options.allowFullscreen,
          },
          width: {
            default: null,
          },
          height: {
            default: null,
          },
          style: {
            default: null,
          },
        };
      },

      parseHTML() {
        return [
          {
            tag: "iframe",
          },
        ];
      },
    }),
  ]);

  // Make the date human-readable in the format "1 Jan 2021"
  const humanDate = new Date(publishDate).toLocaleDateString("en-SG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Place output into Isomer Schema format
  const schema = {
    layout: "article",
    page: {
      title: title.toString(),
      category: getArticleCategory(title, html),
      articlePageHeader: {
        summary: [""],
      },
      date: humanDate,
    },
    version: "0.1.0",
    content: getCleanedSchema(output.content),
  };

  return convertFromTiptap(schema);
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
      .map(async ({ title, url, newUrl, publishDate, html }) => {
        const isHtmlContainingRedundantDivs =
          getIsHtmlContainingRedundantDivs(html);

        if (EXCLUSION_LIST.includes(newUrl)) {
          reportItems.push({
            title:
              typeof title === "string" ? title.replaceAll('"', '""') : title,
            url: `${ORIGIN_URL_PREFIX}${url}`,
            newUrl: `${DESTINATION_URL_PREFIX}${newUrl}`,
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
            newUrl: `${DESTINATION_URL_PREFIX}${newUrl}`,
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
            newUrl: `${DESTINATION_URL_PREFIX}${newUrl}`,
            publishDate,
            status: "Migrated",
            remarks: "HTML contained redundant div tags that were removed",
          });
        } else if (html.includes("<iframe")) {
          reportItems.push({
            title:
              typeof title === "string" ? title.replaceAll('"', '""') : title,
            url: `${ORIGIN_URL_PREFIX}${url}`,
            newUrl: `${DESTINATION_URL_PREFIX}${newUrl}`,
            publishDate,
            status: "Migrated",
            remarks: "HTML contains iframe tags",
          });
        } else if (html.includes("<img ")) {
          reportItems.push({
            title:
              typeof title === "string" ? title.replaceAll('"', '""') : title,
            url: `${ORIGIN_URL_PREFIX}${url}`,
            newUrl: `${DESTINATION_URL_PREFIX}${newUrl}`,
            publishDate,
            status: "Needs review",
            remarks: "HTML contains img tags",
          });
        } else {
          reportItems.push({
            title:
              typeof title === "string" ? title.replaceAll('"', '""') : title,
            url: `${ORIGIN_URL_PREFIX}${url}`,
            newUrl: `${DESTINATION_URL_PREFIX}${newUrl}`,
            publishDate,
            status: "Migrated",
            remarks: "",
          });
        }

        const schema = await convertHtmlToSchema(title, publishDate, html);

        // Save schema to file
        await fs.writeFile(
          `output/${newUrl}.json`,
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

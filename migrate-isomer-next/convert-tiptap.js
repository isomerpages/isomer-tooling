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

// Converts a Tiptap-based schema to an Isomer Next schema
// tiptapSchema: The schema object from Tiptap
// headerBlock: A block to add to the beginning of the schema
const convertFromTiptap = (tiptapSchema, headerBlock) => {
  // Iterate through all the items in the content key of the schema and group
  // them into a prose block. If a "type": "iframe" is found, do not add to the
  // current prose block, keep it separate and continue the process for the
  // remaining blocks
  const outputContent = [];

  if (!!headerBlock) {
    outputContent.push(headerBlock);
  }

  let proseBlock = {
    type: "prose",
    content: [],
  };

  schema.content.forEach((component) => {
    if (component.type === "iframe") {
      outputContent.push(proseBlock);
      outputContent.push(component);
      proseBlock = {
        type: "prose",
        content: [],
      };
    } else if (component.type === "image") {
      outputContent.push(proseBlock);
      outputContent.push(component);
      proseBlock = {
        type: "prose",
        content: [],
      };
    } else {
      proseBlock.content.push(component);
    }
  });

  if (proseBlock.content.length > 0) {
    outputContent.push(proseBlock);
  }

  return {
    ...schema,
    content: outputContent,
  };
};

// Performs some cleaning up of the Tiptap schema due to poor usage of HTML
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

  // Recursively find for double hard breaks in a paragraph node and remove them
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
        (component.type === "paragraph" ||
          component.type === "heading" ||
          component.type === "tableHeader") &&
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

  // Recursively find for "type": "link" and keep only the relevant attributes
  // among all the existing attributes stored in the attrs key
  const findLink = (schema) => {
    schema.forEach((component) => {
      if (
        component.type === "text" &&
        component.marks &&
        component.marks.some((mark) => mark.type === "link")
      ) {
        const newMarks = component.marks.map((mark) => {
          if (mark.type === "link" && mark.attrs) {
            const newAttrs = {
              href: mark.attrs.href,
            };

            if (mark.attrs.target === "_blank") {
              newAttrs.target = "_blank";
            }

            return {
              ...mark,
              attrs: newAttrs,
            };
          } else {
            return mark;
          }
        });

        component.marks = [...newMarks];
      } else if (component.content) {
        findLink(component.content);
      }
    });

    return schema;
  };

  return findIframe(
    findLink(
      removeEmptyParagraphs(
        findTableHeader(
          findHardBreak(findParagraphHardBreak(findTable(schema)))
        )
      )
    )
  );
};

export const convertHtmlToSchema = (title, publishDate, category, html) => {
  const output = generateJSON(html, [
    // Blockquote,
    Bold,
    BulletList.extend({
      name: "unorderedList",
    }).configure({
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
    Heading.extend({
      marks: "",
    }),
    History,
    HorizontalRule.extend({
      name: "divider",
    }),
    Image,
    Italic,
    Link,
    ListItem,
    OrderedList.extend({
      name: "orderedList",
    }).configure({
      HTMLAttributes: {
        class: "list-decimal",
      },
    }),
    Paragraph,
    Strike,
    Superscript,
    Subscript,
    Table.extend({
      addAttributes() {
        return {
          caption: {
            default: "Table caption",
          },
        };
      },
    }).configure({
      resizable: false,
    }),
    TableRow,
    TableHeader.extend({
      content: "paragraph+",
    }),
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
      category,
      articlePageHeader: {
        summary: [""],
      },
      date: humanDate,
    },
    version: "0.1.0",
    content: [
      {
        type: "callout",
        content: {
          type: "prose",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This article has been migrated from an earlier version of the site and may display formatting inconsistencies.",
                },
              ],
            },
          ],
        },
      },
      ...getCleanedSchema(output.content),
    ],
  };

  return convertFromTiptap(schema);
};

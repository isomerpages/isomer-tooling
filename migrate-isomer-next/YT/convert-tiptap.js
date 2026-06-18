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
const jsdom = require("jsdom");
const fs = require("fs");
const { mkdir } = require("fs/promises");
const { Readable } = require("stream");
const { finished } = require("stream/promises");
const path = require("path");

// CONFIGURATION SETTINGS
// This is the base URL for the actual live site, used for downloading images
// and files directly from them
const SITE_BASE_URL = "https://www.mfa.gov.sg/";
// This is the path prefix for the folder that will host the downloaded images
// inside the GitHub repository relative to the `public` folder
const IMAGES_PATH_PREFIX = "/images";
// This is the path prefix for the folder that will host the downloaded files
// inside the GitHub repository relative to the `public` folder
const FILES_PATH_PREFIX = "/files";

// This is the logic used to determine if a particular link is to a file that
// should be downloaded and hosted on the new site
const isFileLink = (link) => {
  return (
    link.startsWith("/docs") ||
    link.startsWith("~/") ||
    link.startsWith("/~/") ||
    link.startsWith("/-/") ||
    link.startsWith("-/")
  );
};

// DO NOT TOUCH BELOW THIS LINE
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

global.IMAGE_DOWNLOADS = {};
global.FILE_DOWNLOADS = {};
let PERMALINK = "";

const getFilenameFromContentDisposition = (contentDisposition) => {
  if (!contentDisposition) {
    return null;
  }

  const regex = /filename="(.+)"/;
  const match = contentDisposition.match(regex);

  if (match) {
    return match[1];
  }

  return null;
};

const fetchWithRetry = async (url) => {
  while (true) {
    const res = await fetch(url);
    if (res.status === 403) {
      console.error("We are getting rate limited!");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } else if (res.status >= 400) {
      console.error("We are getting errors:", res.status);
      throw new Error();
      // await new Promise((resolve) => setTimeout(resolve, 5000));
    } else {
      return res;
    }
  }
};

const downloadFile = async (url, type, fileName) => {
  // console.log("Downloading file:", url);
  // Jank from CCCS website
  // const updatedUrl = url.startsWith(`${SITE_BASE_URL}~/`)
  //   ? url.replace("~/", "/media-and-consultation/newsroom/media-releases/~/")
  //   : url;
  const res = await fetchWithRetry(url);
  const finalFileName =
    getFilenameFromContentDisposition(res.headers.get("content-disposition")) ||
    fileName;
  const destination = path.resolve(
    "./downloads",
    type,
    PERMALINK,
    finalFileName.toLowerCase().replaceAll(".jpeg", ".jpg")
  );
  const folder = path.dirname(destination);

  if (!fs.existsSync(folder)) await mkdir(folder, { recursive: true });
  try {
    const fileStream = fs.createWriteStream(destination, { flags: "wx" });
    await finished(Readable.fromWeb(res.body).pipe(fileStream));
    return finalFileName.toLowerCase().replaceAll(".jpeg", ".jpg");
  } catch (err) {
    if (err.code === "EEXIST") {
      // console.log("File already exists:", destination);
      return finalFileName;
    } else {
      console.error(err);
    }
  }
};

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

// Converts a Tiptap-based schema to an Isomer Next schema
// tiptapSchema: The schema object from Tiptap
// headerBlock: A block to add to the beginning of the schema
const convertFromTiptap = async (schema, headerBlock) => {
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

  // let galleryBlock = {
  //   type: "imagegallery",
  //   images: [],
  // };
  for (const component of schema) {
    if (component.type === "iframe") {
      outputContent.push(proseBlock);

      if (component.content) {
        const elem = document.createElement("div");
        elem.innerHTML = component.content;
        const iframe = elem.querySelector("iframe");
        const src = iframe.getAttribute("src");
        const srcUrl = new URL(src);

        if (srcUrl.host.includes("youtube.com")) {
          const title = iframe.getAttribute("title") || "YouTube video";

          outputContent.push({
            type: "video",
            title,
            url: src,
          });
        } else if (
          srcUrl.host.includes("google.com") &&
          srcUrl.pathname.startsWith("/maps")
        ) {
          const title = iframe.getAttribute("title") || "Google Maps";

          outputContent.push({
            type: "map",
            title,
            url: src,
          });
        } else if (srcUrl.host.includes("docs.google.com")) {
          outputContent.push({
            type: "prose",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [
                      {
                        type: "link",
                        attrs: {
                          href: src,
                        },
                      },
                    ],
                    text: "See the full deck on Google Slides.",
                  },
                ],
              },
            ],
          });
        } else {
          outputContent.push(component);
        }
      }

      proseBlock = {
        type: "prose",
        content: [],
      };
    } else if (component.type === "image") {
      outputContent.push(proseBlock);
      const { attrs, ...rest } = component;
      const { alt, src } = attrs;

      if (!!alt && alt.length > 120) {
        console.log("Image alt text is too long:", alt);
        console.log("Image source:", src);
      }

      const fileName = src.split("?")[0].split("/").pop();
      const newSrc = `${IMAGES_PATH_PREFIX}/${PERMALINK}/${fileName}`;

      const newFilename = await downloadFile(
        `${SITE_BASE_URL}${src.replace(SITE_BASE_URL, "")}`,
        "images",
        fileName
      );

      const updatedSrc =
        newSrc.split("/").slice(0, -1).join("/") + "/" + newFilename;

      if (Object.keys(global.IMAGE_DOWNLOADS).includes(updatedSrc)) {
        console.log("Image already downloaded:", updatedSrc);
      }

      global.IMAGE_DOWNLOADS[src] = updatedSrc;

      outputContent.push({
        src: updatedSrc,
        alt,
        ...rest,
      });
      proseBlock = {
        type: "prose",
        content: [],
      };
    } else if (component.type === "infobar") {
      outputContent.push(proseBlock);
      const { attrs, ...rest } = component;
      outputContent.push({
        ...attrs,
        ...rest,
      });
      proseBlock = {
        type: "prose",
        content: [],
      };
    } else if (component.type === "contentpic") {
      outputContent.push(proseBlock);
      // console.log(JSON.stringify(component));
      const { attrs, content, ...rest } = component;
      const { imageAlt, imageSrc } = attrs;

      if (!imageAlt) {
        console.log(
          "Contentpic image alt text is missing:",
          JSON.stringify(component)
        );
      } else if (imageAlt.length > 120) {
        console.log("Contentpic image alt text is too long:", imageAlt);
        console.log("Contentpic image source:", imageSrc);
      }

      const fileName = imageSrc.split("?")[0].split("/").pop();
      const newSrc = `${IMAGES_PATH_PREFIX}/${PERMALINK}/${fileName}`;
      if (Object.keys(global.IMAGE_DOWNLOADS).includes(imageSrc)) {
        console.log("Image already downloaded:", imageSrc);
      }

      global.IMAGE_DOWNLOADS[imageSrc] = newSrc;
      // const newContent = content
      //   .filter((c) => c.type !== "image")
      //   .map((c) => {
      //     if (c.type === "paragraph") {
      //       const { attrs, ...rest } = c;
      //       return {
      //         ...rest,
      //       };
      //     }

      //     if (c.type === "contentpic") {
      //       return c.content[0];
      //     }

      //     return c;
      //   });

      // outputContent.push({
      //   type: "prose",
      //   content: [
      //     {
      //       type: "heading",
      //       attrs: {
      //         level: 2,
      //       },
      //       content: newContent[1].content
      //         .filter((c) => c.type !== "hardBreak")
      //         .map((c) => {
      //           const { marks, ...rest } = c;
      //           return {
      //             ...rest,
      //           };
      //         }),
      //     },
      //   ],
      // });

      outputContent.push({
        imageSrc: newSrc,
        imageAlt,
        ...rest,
        content: {
          type: "prose",
          // content: [...newContent.slice(2), newContent[0]],
          content,
        },
      });
      proseBlock = {
        type: "prose",
        content: [],
      };
    } else if (
      component.type === "paragraph" &&
      component.content &&
      component.content.length === 1 &&
      component.content[0].type === "text" &&
      component.content[0].marks &&
      component.content[0].marks.some((mark) => mark.type === "link") &&
      (component.content[0].text.toLocaleLowerCase() ===
        "share your feedback" ||
        component.content[0].text.toLocaleLowerCase() === "share your views")
    ) {
      outputContent.push(proseBlock);

      outputContent.push({
        type: "infobar",
        title: "Have any thoughts and views on this?",
        buttonLabel: "Share your feedback",
        buttonUrl: component.content[0].marks[0].attrs.href,
      });

      proseBlock = {
        type: "prose",
        content: [],
      };
    } else if (component.type === "paragraph") {
      const { attrs, ...rest } = component;
      const newComponent = {
        ...rest,
      };

      if (
        attrs &&
        attrs.class &&
        attrs.class.length === 2 &&
        attrs.class[0] === "h"
      ) {
        proseBlock.content.push({
          type: "heading",
          attrs: {
            level: parseInt(attrs.class[1]),
          },
          content: newComponent.content,
        });
      } else {
        proseBlock.content.push(newComponent);
      }
    } else if (
      component.type === "orderedList" ||
      component.type === "unorderedList"
    ) {
      // Extract out all images in list items, and put different paragraphs in
      // the same list item to become two hard breaks
      let newListItems = [];

      component.content.forEach((listItem) => {
        let newListItemParagraphContent = [];
        listItem.content.forEach((listItemContent) => {
          if (listItemContent.type === "image") {
            if (newListItems.length > 0) {
              proseBlock.content.push({
                ...component,
                content: newListItems,
              });
              newListItems = [];
            }

            if (proseBlock.content.length > 0) {
              outputContent.push(proseBlock);
              proseBlock = {
                type: "prose",
                content: [],
              };
            }

            const { attrs, ...rest } = listItemContent;

            outputContent.push({
              ...rest,
              ...listItemContent.attrs,
              alt: listItemContent.attrs.alt || PLACEHOLDER_ALT_TEXT,
            });
          } else if (listItemContent.type === "paragraph") {
            // Within a paragraph, there can be content of type text, orderedList or unorderedList
            // Recursively check the orderedList and unorderedList such that the hierarchy
            // is (orderedList | unorderedList) -> listItem -> (paragraph | orderedList | unorderedList)
            // Ensure nested orderedList and unorderedList are not a child of paragraph
            const organizeListItems = (paragraphItems) => {
              const newListItemContent = [];
              let newParagraphItems = [];

              paragraphItems.forEach((pItem) => {
                if (
                  pItem.type === "orderedList" ||
                  pItem.type === "unorderedList"
                ) {
                  if (newParagraphItems.length > 0) {
                    newListItemContent.push({
                      type: "paragraph",
                      content: newParagraphItems,
                    });

                    newParagraphItems = [];
                  }

                  const recurseList = {
                    ...pItem,
                    content: pItem.content.map((li) => ({
                      ...li,
                      content: li.content.map((lic) =>
                        organizeListItems(lic.content)
                      ),
                    })),
                  };

                  newListItemContent.push(recurseList);
                } else {
                  newParagraphItems.push(pItem);
                }
              });

              if (newParagraphItems.length > 0) {
                newListItemContent.push({
                  type: "paragraph",
                  content: newParagraphItems,
                });
              }

              return newListItemContent;
            };

            // if (newListItemParagraphContent.length > 0) {
            //   // Add two hard breaks to separate paragraphs
            //   newListItemParagraphContent.push({
            //     type: "hardBreak",
            //   });
            //   newListItemParagraphContent.push({
            //     type: "hardBreak",
            //   });
            // }

            newListItemParagraphContent = newListItemParagraphContent.concat(
              organizeListItems(listItemContent.content)
            );
          } else {
            newListItemParagraphContent.push(listItemContent);
          }
        });

        if (newListItemParagraphContent.length > 0) {
          newListItems.push({
            type: "listItem",
            content: newListItemParagraphContent,
          });

          newListItemParagraphContent = [];
        }
      });

      if (newListItems.length > 0) {
        proseBlock.content.push({
          ...component,
          content: newListItems,
        });

        newListItems = [];
      }
    } else {
      proseBlock.content.push(component);
    }
  }

  // For MINDEF image gallery
  // if (galleryBlock.images.length > 0) {
  //   outputContent.push(
  //     galleryBlock
  //   );
  // }

  if (proseBlock.content.length > 0) {
    outputContent.push(proseBlock);
  }

  const finalContent = [];

  outputContent.forEach((block) => {
    if (block.type === "prose" && block.content.length > 0) {
      const newProseContent = [];
      block.content.forEach((component, index) => {
        if (
          component.type === "paragraph" &&
          component.content.length === 1 &&
          component.content[0].type === "hardBreak" &&
          index < block.content.length - 1 &&
          block.content[index + 1].type === "heading"
        ) {
          // Skip the hardBreak if it is followed by a heading
        } else if (
          component.type === "divider" &&
          index < block.content.length - 1 &&
          block.content[index + 1].type === "heading"
        ) {
          // Skip the divider if it is followed by a heading
        } else if (
          component.type === "heading" &&
          component.attrs.level === 4
        ) {
          newProseContent.push({
            ...component,
            attrs: {
              level: 2,
            },
          });
        } else {
          newProseContent.push(component);
        }
      });

      finalContent.push({
        ...block,
        content: newProseContent,
      });
    } else if (block.type === "prose" && block.content.length === 0) {
      // Skip empty prose blocks
    } else {
      finalContent.push(block);
    }
  });

  return finalContent;
};

// Performs some cleaning up of the Tiptap schema due to poor usage of HTML
const getCleanedSchema = async (schema) => {
  // Recursively find components with "type": "table" and add a new key "caption"
  // then return the schema
  const findTable = (schema) => {
    schema.forEach((component) => {
      if (component.type === "table") {
        component.caption = "";

        // Remove any empty tableRow
        component.content = component.content.filter(
          (row) => row.content && row.content.length > 0
        );
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

  /// Recursively find for "type": "paragraph" with no content key, then remove
  // the component from the schema
  const removeEmptyParagraphs = (schema) => {
    return schema.filter((component) => {
      if (
        (component.type === "paragraph" ||
          component.type === "heading" ||
          component.type === "tableHeader") &&
        (!component.content ||
          component.content.length === 0 ||
          component.content.every((c) => c.type === "hardBreak"))
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
  const findLink = async (schema) => {
    for (const component of schema) {
      // YT - check if > 1 paragraph block exist
      if (
        component.type === "orderedList" ||
        component.type === "unorderedList"
      ) {
        component.content.forEach((prev) => {
          if (prev.content.length > 1) {
            // Create a new array of a object that retains all key-pair value of
            // the first paragraph, and overwrite first paragraph "content" with all paragraph blocks in the old copy
            prev.content = [
              {
                ...prev.content[0],
                content: prev.content.flatMap((item) => item.content),
              },
            ];
          }
        });
      } else if (
        component.type === "text" &&
        component.marks &&
        component.marks.some((mark) => mark.type === "link")
      ) {
        const newMarks = await Promise.all(
          component.marks.map(async (mark) => {
            if (mark.type === "link" && mark.attrs) {
              const newAttrs = {
                href: mark.attrs.href,
              };

              if (isFileLink(mark.attrs.href)) {
                const fileName = mark.attrs.href.split("?")[0].split("/").pop();
                var fileType = fileName
                  .split(".")
                  [fileName.split(".").length - 1].replaceAll("pdf", "PDF")
                  .replaceAll("doc", "DOC")
                  .replaceAll("docx", "DOCX")
                  .replaceAll("xlsx", "XLSX")
                  .replaceAll("xls", "XLS")
                  .replaceAll("csv", "CSV")
                  .replaceAll("tsv", "TSV");
                const newHref = `${FILES_PATH_PREFIX}/${PERMALINK}/${fileName}`;

                if (
                  Object.keys(global.FILE_DOWNLOADS).includes(mark.attrs.href)
                ) {
                  // console.log("File already downloaded:", mark.attrs.href);
                }
                const newFilename = await downloadFile(
                  `${SITE_BASE_URL}${mark.attrs.href.replace(
                    SITE_BASE_URL,
                    ""
                  )}`,
                  "files",
                  fileName
                );

                const updatedHref =
                  newHref.split("/").slice(0, -1).join("/") + "/" + newFilename;

                global.FILE_DOWNLOADS[mark.attrs.href] = updatedHref;
                console.log(JSON.stringify(global.FILE_DOWNLOADS));
                newAttrs.href = updatedHref;

                // var stats = fs.statSync(`./downloads/files/${PERMALINK.replaceAll("'", "-")}/${fileName.replaceAll("'", "-")}`);
                // var bytes = Math.round(stats.size/1024);

                // if ((stats.size/1000).toString().length >= 1 || (stats.size/1000).toString().length <= 3) {
                //   bytes += " KB"
                // }
                // else if ((stats.size/1000).toString().length >= 4 || (stats.size/1000).toString().length < 7) {
                //     bytes += " MB"
                // } else {
                //   bytes += " B"
                // }
                // component.text += ` [${fileType}, ${bytes}]`;
              } else {
                console.log("Blacklisted file type detected. Skip downloading");
              }

              if (
                mark.attrs.target === "_blank" &&
                !mark.attrs.href.startsWith("/")
              ) {
                newAttrs.target = "_blank";
              }

              return {
                ...mark,
                attrs: newAttrs,
              };
            } else {
              return mark;
            }
          })
        );

        component.marks = [...newMarks];
      } else if (component.content) {
        await findLink(component.content);
      }
    }

    return schema;
  };

  return findIframe(
    await findLink(
      removeEmptyParagraphs(
        findTableHeader(
          findHardBreak(findParagraphHardBreak(findTable(schema)))
        )
      )
    )
  );
};

/**
 * Move all chldren out of an element, and remove the element.
 */
const unwrap = (el) => {
  let parent = el.parentNode;

  // Move all children to the parent element.
  while (el.firstChild) parent.insertBefore(el.firstChild, el);

  // Remove the empty element.
  parent.removeChild(el);
};

/**
 * Move all chldren out of an anchor, and set a replacement text.
 */
const unwrapLink = (el, replacementText) => {
  let parent = el.parentNode;

  // Move all children to the parent element.
  while (el.firstChild) parent.insertBefore(el.firstChild, el);

  // Keep the anchor in the dom but since it's empty we'll
  // set a replacement text.
  el.textContent = replacementText;
};

/**
 * Wrap a dom node with another node.
 */
const wrap = (el, wrapper) => {
  el.parentNode.insertBefore(wrapper, el);
  wrapper.appendChild(el);
};

const fixTipTapContent = (html) => {
  let container = document.createElement("div");
  container.innerHTML = html;

  let el;
  // Move all images out of anchors, and set replacement text for the anchors.
  while ((el = container.querySelector("a > img"))) {
    unwrapLink(el.parentNode, el.getAttribute("alt") || "Image link");
  }

  // Move all images out of paragraphs.
  while ((el = container.querySelector("p > img"))) {
    unwrap(el.parentNode);
  }

  // Wrap all non-paragraph-wrapped anchors in paragraphs.
  while ((el = container.querySelector("a:not(p a)"))) {
    wrap(el, document.createElement("p"));
  }

  // Move youtube iframes out of paragraphs.
  while ((el = container.querySelector('p > iframe[src*="youtube.com"]'))) {
    unwrap(el.parentNode);
  }

  // Wrap youtube iframes in the proper tiptap-element.
  while (
    (el = container.querySelector(
      ':not([data-youtube-video]) > iframe[src*="youtube.com"]'
    ))
  ) {
    let wrapper = document.createElement("div");
    wrapper.dataset.youtubeVideo = true;
    wrap(el, wrapper);
  }

  return container.innerHTML;
};

const convertHtmlToSchema = async (html, permalink) => {
  global.IMAGE_DOWNLOADS = {};
  global.FILE_DOWNLOADS = {};
  PERMALINK = permalink;

  const output = generateJSON(fixTipTapContent(html), [
    // Blockquote,
    Bold.extend({
      parseHTML() {
        return [
          {
            tag: "strong",
          },
          {
            tag: "dt",
          },
          {
            tag: "b",
            getAttrs: (node) => node.style.fontWeight !== "normal" && null,
          },
          {
            style: "font-weight=400",
            clearMark: (mark) => mark.type.name === this.name,
          },
          {
            style: "font-weight",
            getAttrs: (value) =>
              /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null,
          },
        ];
      },
    }),
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
      content: "text*",
      marks: "",
    }).configure({
      levels: [2, 3, 4, 5],
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
    Paragraph.extend({
      addAttributes() {
        return {
          class: {
            default: undefined,
          },
        };
      },
      parseHTML() {
        return [{ tag: "p" }, { tag: "dd" }];
      },
    }),
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
            priority: 10000,
          },
        ];
      },
    }),
    // Custom parser for Contentpic specific for CLC sites
    // Node.create({
    //   name: "contentpic",
    //   group: "block",
    //   atom: true,
    //   draggable: true,
    //   defining: true,
    //   content: "paragraph*",

    //   addAttributes() {
    //     return {
    //       imageSrc: {
    //         default: null,
    //         parseHTML: (element) => {
    //           try {
    //             const image = [
    //               "col-md-2",
    //               "col-md-3",
    //               "col-md-4",
    //               "col-md-5",
    //               "col-md-6",
    //               "col-md-7",
    //               "col-md-8",
    //               "col-md-9",
    //             ].reduce((acc, cur) => {
    //               if (acc) {
    //                 return acc;
    //               }

    //               const child = element.getElementsByClassName(cur)[0];
    //               if (child) {
    //                 const image = child.getElementsByTagName("img")[0];
    //                 return image;
    //               }
    //             }, undefined);

    //             // console.log("test", element);
    //             // console.log("test", image);

    //             if (!image) {
    //               return null;
    //             }

    //             return image.getAttribute("src");
    //           } catch (e) {
    //             console.log(element);
    //             console.error(e);
    //             throw e;
    //           }
    //         },
    //       },
    //       imageAlt: {
    //         default: null,
    //         parseHTML: (element) => {
    //           const image = [
    //             "col-md-2",
    //             "col-md-3",
    //             "col-md-4",
    //             "col-md-5",
    //             "col-md-6",
    //             "col-md-7",
    //             "col-md-8",
    //             "col-md-9",
    //           ].reduce((acc, cur) => {
    //             if (acc) {
    //               return acc;
    //             }

    //             const child = element.getElementsByClassName(cur)[0];
    //             if (child) {
    //               const image = child.getElementsByTagName("img")[0];
    //               return image;
    //             }
    //           }, undefined);

    //           if (!image) {
    //             return null;
    //           }

    //           return image.getAttribute("alt");
    //         },
    //       },
    //     };
    //   },

    //   parseHTML() {
    //     return [
    //       "col-md-2",
    //       "col-md-3",
    //       "col-md-4",
    //       "col-md-5",
    //       "col-md-6",
    //       "col-md-7",
    //       "col-md-8",
    //       "col-md-9",
    //     ].map((col) => ({
    //       tag: `div.row:has(> div.${col} > img)`,
    //     }));
    //   },
    // }),
    // Node.create({
    //   name: "contentpic",
    //   group: "block",
    //   atom: true,
    //   draggable: true,
    //   defining: true,
    //   content: "paragraph*",

    //   addAttributes() {
    //     return {
    //       imageSrc: {
    //         default: null,
    //         parseHTML: (element) => {
    //           console.log(element);

    //           try {
    //             const child = element.getElementsByClassName(
    //               "description-group--image"
    //             )[0];
    //             const image = child.getElementsByTagName("img")[0];

    //             if (!image) {
    //               return null;
    //             }

    //             return image.getAttribute("src");
    //           } catch (e) {
    //             console.log(element);
    //             console.error(e);
    //             throw e;
    //           }
    //         },
    //       },
    //       imageAlt: {
    //         default: null,
    //         parseHTML: (element) => {
    //           console.log(element);
    //           try {
    //             const child = element.getElementsByClassName(
    //               "description-group--image"
    //             )[0];
    //             const image = child.getElementsByTagName("img")[0];

    //             if (!image) {
    //               return null;
    //             }

    //             return image.getAttribute("alt");
    //           } catch (e) {
    //             console.log(element);
    //             console.error(e);
    //             throw e;
    //           }
    //         },
    //       },
    //     };
    //   },

    //   parseHTML() {
    //     [
    //       {
    //         tag: "div:has(.contentpic)",
    //       },
    //     ];
    //   },
    // }),

    // Custom parser for Infobar
    //   Node.create({
    //     name: "infobar",
    //     group: "block",
    //     atom: true,
    //     draggable: true,
    //     defining: true,
    //     priority: 10001,
    //     // content: "paragraph*",

    //     addAttributes() {
    //       return {
    //         title: {
    //           default: "Have any thoughts and views on this?",
    //         },
    //         buttonLabel: {
    //           default: "Share your feedback",
    //         },
    //         buttonUrl: {
    //           default: null,
    //           parseHTML: (element) => {
    //             try {
    //               element.getAttribute("href");
    //             } catch (e) {
    //               console.log(element);
    //               console.error(e);
    //               throw e;
    //             }
    //           },
    //         },
    //       };
    //     },

    //     parseHTML() {
    //       [
    //         {
    //           tag: "a:has(> button.btn--primary)",
    //         },
    //       ];
    //     },
    //   }),
  ]);

  // Make the date human-readable in the format "DD/MM/YYYY"
  // const humanDate = new Date(publishDate).toLocaleDateString("en-GB");

  // Place output into Isomer Schema format
  // const schema = {
  //   layout: "article",
  //   page: {
  //     title: title.toString(),
  //     category,
  //     articlePageHeader: {
  //       summary: "",
  //     },
  //     date: humanDate,
  //   },
  //   version: "0.1.0",
  //   content: getCleanedSchema(output.content),
  // };

  const schema = await getCleanedSchema(output.content);
  const result = await convertFromTiptap(schema);

  // Download all images
  // await Promise.all(
  //   Object.keys(global.IMAGE_DOWNLOADS).map((url) => {
  //     const fileName = global.IMAGE_DOWNLOADS[url].split("/").pop();
  //     const path = url.replace(SITE_BASE_URL, "");

  //     if (!path.startsWith("/")) {
  //       // console.log("Invalid image path:", path);
  //       return;
  //     }

  //     return downloadFile(`${SITE_BASE_URL}${path}`, "images", fileName);
  //   })
  // );

  console.log(JSON.stringify(global.FILE_DOWNLOADS));

  // Download all files
  // await Promise.all(
  //   Object.keys(global.FILE_DOWNLOADS).map((url) => {
  //     const fileName = global.FILE_DOWNLOADS[url].split("/").pop();
  //     const path = url.replace(SITE_BASE_URL, "");

  //     if (!path.startsWith("/")) {
  //       console.log("Invalid file path:", path);
  //       return;
  //     }

  //     return downloadFile(`${SITE_BASE_URL}${path}`, "files", fileName);
  //   })
  // );

  const filesMapping = {
    ...global.IMAGE_DOWNLOADS,
    ...global.FILE_DOWNLOADS,
  };

  // const data = await fs.promises.readFile("filesMapping.json");
  console.log(filesMapping);

  // let existingData = {};
  // try {
  //   existingData = JSON.parse(data);
  // } catch (e) {
  //   console.log("No existing data found");
  // }
  // const newData = {
  //   ...existingData,
  //   ...filesMapping,
  // };

  // await fs.promises.writeFile(
  //   "filesMapping.json",
  //   JSON.stringify(newData, null, 2),
  //   (err) => {
  //     if (err) throw err;
  //   }
  // );

  return result;
};

module.exports = {
  convertHtmlToSchema,
  getIsHtmlContainingRedundantDivs,
};

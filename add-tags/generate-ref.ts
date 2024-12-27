import { parse } from "csv-parse";
import path from "node:path";
import * as fs from "fs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import dayjs from "dayjs";
import {
  BASE_COLLECTION_INDEX_JSON,
  BASE_COLLECTION_PAGE_JSON,
  BASE_COLLECTION_REF_JSON,
} from "./constants";

const DATA_FILE = "collections.csv";

dayjs.extend(customParseFormat);

const options = {
  year: "numeric",
  day: "2-digit",
  month: "short",
} as const;

interface Tag {
  category: string;
  selected: string[];
}

interface GenerateRefProps {
  title: string;
  ref: string;
  category: string;
  date?: string;
  imageSrc: string;
  description: string;
  tags: Tag[];
}
export const generateRef = ({
  ref,
  description,
  title,
  category,
  date,
  imageSrc,
  tags,
}: GenerateRefProps) => {
  return {
    ...BASE_COLLECTION_REF_JSON,
    page: {
      title,
      ref,
      category,
      // NOTE: need to check for the format
      date: date ?? new Date().toLocaleDateString("en-GB", options),
      image: {
        src: imageSrc,
        alt: "This is an image of a CLS product",
      },
      tags,
      description,
    },
  };
};

interface GenerateIndexProps {
  title: string;
  subtitle: string;
}
export const generateCollectionIndex = ({
  title,
  subtitle,
}: GenerateIndexProps) => {
  return {
    ...BASE_COLLECTION_INDEX_JSON,
    page: {
      ...BASE_COLLECTION_INDEX_JSON.page,
      title,
      subtitle,
    },
  };
};

export const generateFolderIndex = () => {};

interface ClsProduct {
  brand: string;
  product: string;
  model: string;
  category: string;
  level: string;
  date: string;
  image: string;
}

const CLS_DATE_FORMAT = "D-MMM-YY";
const COLLECTIONS_DATE_FORMAT = "DD/MM/YYYY";

export const generateCollection = (
  csvPath: string,
  collectionPath: string,
  folderPath: string,
) => {
  const data = fs.readFileSync(csvPath);
  const records = parse(data, { columns: true });

  let counter = 0;

  const collectionIndex = generateCollectionIndex({
    title: "Cybersecurity Labelling Scheme (CLS) Product List",
    subtitle: "This page lists the products registered under the CLS.",
  });

  const indexFilename = collectionPath.split("/").at(-1);
  const indexFilepath = collectionPath.split("/").slice(0, -1).join("/");

  fs.writeFileSync(
    path.join(indexFilepath, `${indexFilename}.json`),
    JSON.stringify(collectionIndex, null, 2),
  );

  // date is in dd-mmm-yy
  records.forEach(
    ({ brand, product, model, category, level, date, image }: ClsProduct) => {
      console.log("processing", model);
      const expiry = dayjs(date, CLS_DATE_FORMAT).format(
        COLLECTIONS_DATE_FORMAT,
      );
      const filename = `${brand}-${model}`
        .toLowerCase()
        .replaceAll(/[^a-zA-Z0-9-]+/g, "-");
      const title = `${brand}, ${model}`;
      const tags = [
        { category: "CLS level", selected: [getLevelTag(parseInt(level))] },
        { category: "Brand", selected: [brand] },
      ];

      const imageSrc = image ?? "https://placehold.co/400";

      const collectionRefItem = generateRef({
        ref: `/our-programmes/certification-and-labelling-schemes/cls/${filename}`,
        title,
        date: expiry,
        tags,
        category,
        description: product,
        imageSrc,
      });

      fs.writeFileSync(
        path.join(collectionPath, `${filename}.json`),
        JSON.stringify(collectionRefItem, null, 2),
      );

      const collectionArticleItem = generateCollectionArticlePage({
        category,
        title,
        date: expiry,
        description: product,
        imageSrc,
        permalink: filename,
      });

      fs.writeFileSync(
        path.join(folderPath, `${filename}.json`),
        JSON.stringify(collectionArticleItem, null, 2),
      );

      counter++;
      return;
    },
  );

  console.log(`wrote ${counter} files`);
};

interface GenerateCollectionArticlePageProps {
  category: string;
  title: string;
  permalink: string;
  description: string;
  date: string;
  imageSrc: string;
}
export const generateCollectionArticlePage = ({
  category,
  title,
  permalink,
  description,
  date,
  imageSrc,
}: GenerateCollectionArticlePageProps): Record<string, unknown> => {
  return {
    ...BASE_COLLECTION_PAGE_JSON,
    page: {
      ...BASE_COLLECTION_PAGE_JSON.page,
      category,
      title,
      permalink,
      lastModified: date,
      date,
      articlePageHeader: {
        summary: " ",
      },
    },
    content: [
      {
        type: "image",
        src: imageSrc,
        alt: "Add your alt text here",
        size: "smaller",
      },
      {
        type: "prose",
        content: [
          {
            type: "heading",
            attrs: {
              dir: "ltr",
              level: 2,
            },
            content: [
              {
                type: "text",
                text: title,
              },
            ],
          },
          {
            type: "paragraph",
            attrs: {
              dir: "ltr",
            },
            content: [
              {
                type: "text",
                text: description,
              },
            ],
          },
        ],
      },
    ],
  };
};

generateCollection(DATA_FILE, "repos/", "repos/");

const getLevelTag = (level: number) => {
  if (!level) {
    console.error("received invalid input: ", level);
    throw new Error();
  }

  return `${"*".repeat(level)} Level ${level}`;
};

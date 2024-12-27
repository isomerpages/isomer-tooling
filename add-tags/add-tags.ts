import { parse } from "csv-parse";
import * as fs from "fs";

const repo = "mddi-reach-next";
const DATA_FILE = "data.csv";

const REPO_PATH = `./repos/${repo}`;

interface PageLike {
  page: Record<string, unknown>;
}

const generateJsonSchemaPath = (path: string) => {
  const processedPath = path.endsWith("/") ? path.slice(0, -1) : path;
  return `${processedPath}.json`;
};

const readJsonFile = (path: string): PageLike => {
  const file = JSON.parse(
    fs.readFileSync(`${REPO_PATH}/schema${path}`).toString(),
  );

  if (!file.page) {
    console.log(`Error encountered reading: ${path}`);
  }

  return file;
};

// NOTE: This is done because of casing/dirty data issues
const normalizeTag = (tag: string) => {
  if (tag.toLowerCase() === "open") return "Open";
  if (tag.toLowerCase() === "closed") return "Closed";
  return "Closed - Summary of Responses";
};

const main = async () => {
  const data = fs.readFileSync(`./${DATA_FILE}`);
  // NOTE: First line of data is a colum header
  const records = parse(data, { columns: true });

  records.forEach(({ path, tag }: { path: string; tag: string }) => {
    const schemaPath = generateJsonSchemaPath(path);
    const schemaFile = readJsonFile(schemaPath);
    const currentPage = schemaFile.page;
    schemaFile.page = {
      ...currentPage,
      tags: [
        {
          category: "Status",
          selected: [normalizeTag(tag)],
        },
      ],
    };

    fs.writeFileSync(
      `${REPO_PATH}/schema${schemaPath}`,
      JSON.stringify(schemaFile, null, 2),
    );

    console.log(`Wrote ${path} successfully`);
  });
};

main()
  .then(() => console.log("finished successfully"))
  .catch((e) => console.log(e));

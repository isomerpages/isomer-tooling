import path from "path";
import type { CsvFileMetadata } from "./parseFileMetadata";

type GetGazetteFilepathProps = {
  folderName: string;
  file: CsvFileMetadata
};

export const getGazetteFilepath = ({
  folderName,
  file,
}: GetGazetteFilepathProps) => {
  return path.join(
    folderName,
    file.folderName,
    file.fileName
  );
};

import fs from "fs";

export const checkIfFilePresent = async (filePath: string) => {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
};  
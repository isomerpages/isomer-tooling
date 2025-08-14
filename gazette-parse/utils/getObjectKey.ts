export type ObjectMetadata = {
  notificationNumber: string;
  fileName: string;
  category: string;
  subCategory: string;
  year: number;
};

export const getObjectKey = ({
  notificationNumber,
  fileName,
  year,
  category,
  subCategory,
}: ObjectMetadata) => {
  const fileNumber = notificationNumber
    ? notificationNumber
    : `${fileName.replace(".pdf", "").replace(".htm", "")}`;

  const isPdfFile = fileName.includes(".pdf");

  return `${year}/${category}/${subCategory}/${fileNumber}.${
    isPdfFile ? "pdf" : "htm"
  }`;
};

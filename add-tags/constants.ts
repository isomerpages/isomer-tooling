export const BASE_COLLECTION_REF_JSON = {
  version: "0.1.0",
  layout: "link",
  content: [],
};

export const BASE_COLLECTION_INDEX_JSON = {
  layout: "collection",
  content: [],
  page: {
    defaultSortBy: "date",
    defaultSortDirection: "desc",
  },
  version: "0.1.0",
};

export const BASE_COLLECTION_PAGE_JSON = {
  page: {
    articlePageHeader: { summary: "" },
  },
  layout: "article",
  version: "0.1.0",
  content: [
    {
      type: "image",
      src: "/placeholder_no_image.png",
      alt: "Add your alt text here",
      size: "smaller",
    },
  ],
} as const;

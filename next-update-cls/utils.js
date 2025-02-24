const moment = require("moment");

const getLinkSchema = ({
  articleId,
  category,
  brand,
  model,
  clsLevel,
  product,
  issuanceDate,
  expirationDate,
  productImage,
  siteId,
}) => {
  const levelStars = Array.from({ length: parseInt(clsLevel) }, () => "✱").join(
    ""
  );

  return {
    page: {
      ref: `[resource:${siteId}:${articleId}]`,
      date: moment(issuanceDate).format("DD/MM/YYYY"),
      tags: [
        {
          category: "CLS Level",
          selected: [`Level ${clsLevel} ${levelStars}`],
        },
        {
          category: "Brand",
          selected: [brand],
        },
      ],
      image: {
        alt: `${brand} ${model}`,
        src: productImage,
      },
      title: `${brand} ${model}`,
      category,
      description: `${product}\nIssued date: ${moment(issuanceDate).format(
        "D MMMM YYYY"
      )}\nExpiry date: ${moment(expirationDate).format("D MMMM YYYY")}`,
    },
    layout: "link",
    content: [],
    version: "0.1.0",
  };
};

const getArticleSchema = ({
  category,
  brand,
  model,
  clsLevel,
  registrationId,
  issuanceDate,
  expirationDate,
  website,
  vdp,
  support,
  productImage,
  labelImage,
}) => {
  return {
    version: "0.1.0",
    meta: {
      image: labelImage,
    },
    page: {
      image: {
        alt: `${brand} ${model}`,
        src: productImage,
      },
      title: `${brand} ${model}`,
      category,
      articlePageHeader: {
        summary: "",
      },
    },
    layout: "article",
    content: [
      {
        alt: `${brand} ${model}`,
        src: productImage,
        size: "smaller",
        type: "image",
      },
      {
        alt: `CLS Label ${registrationId.replace("CSA/", "")}`,
        src: labelImage,
        size: "smaller",
        type: "image",
      },
      {
        type: "prose",
        content: [
          {
            type: "unorderedList",
            content: [
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: {
                      dir: "ltr",
                    },
                    content: [
                      {
                        text: "Model No.: ",
                        type: "text",
                        marks: [
                          {
                            type: "bold",
                          },
                        ],
                      },
                      {
                        text: model,
                        type: "text",
                      },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: {
                      dir: "ltr",
                    },
                    content: [
                      {
                        text: "CLS Level: ",
                        type: "text",
                        marks: [
                          {
                            type: "bold",
                          },
                        ],
                      },
                      {
                        text: `Level ${clsLevel}`,
                        type: "text",
                      },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: {
                      dir: "ltr",
                    },
                    content: [
                      {
                        text: "Registration ID: ",
                        type: "text",
                        marks: [
                          {
                            type: "bold",
                          },
                        ],
                      },
                      {
                        text: registrationId,
                        type: "text",
                      },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: {
                      dir: "ltr",
                    },
                    content: [
                      {
                        text: "Date of Issuance: ",
                        type: "text",
                        marks: [
                          {
                            type: "bold",
                          },
                        ],
                      },
                      {
                        text: moment(issuanceDate).format("D MMMM YYYY"),
                        type: "text",
                      },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: {
                      dir: "ltr",
                    },
                    content: [
                      {
                        text: "Date of Expiration: ",
                        type: "text",
                        marks: [
                          {
                            type: "bold",
                          },
                        ],
                      },
                      {
                        text: moment(expirationDate).format("D MMMM YYYY"),
                        type: "text",
                      },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: {
                      dir: "ltr",
                    },
                    content: [
                      {
                        text: "Issued via Mutual Recognition: ",
                        type: "text",
                        marks: [
                          {
                            type: "bold",
                          },
                        ],
                      },
                      {
                        text: "-",
                        type: "text",
                      },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: {
                      dir: "ltr",
                    },
                    content: [
                      {
                        text: "Assessed By: ",
                        type: "text",
                        marks: [
                          {
                            type: "bold",
                          },
                        ],
                      },
                      {
                        text: "-",
                        type: "text",
                      },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: {
                      dir: "ltr",
                    },
                    content: [
                      {
                        text: "Remarks: ",
                        type: "text",
                        marks: [
                          {
                            type: "bold",
                          },
                        ],
                      },
                      {
                        text: "-",
                        type: "text",
                      },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: {
                      dir: "ltr",
                    },
                    content: [
                      {
                        text: "Product Website",
                        type: "text",
                        marks: [
                          {
                            type: "link",
                            attrs: {
                              href: website,
                              target: "_blank",
                            },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: {
                      dir: "ltr",
                    },
                    content: [
                      {
                        text: "Support Period",
                        type: "text",
                        marks: [
                          {
                            type: "link",
                            attrs: {
                              href: support,
                              target: "_blank",
                            },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: "listItem",
                content: [
                  {
                    type: "paragraph",
                    attrs: {
                      dir: "ltr",
                    },
                    content: [
                      {
                        text: "Vulnerability Disclosure Policy",
                        type: "text",
                        marks: [
                          {
                            type: "link",
                            attrs: {
                              href: vdp,
                              target: "_blank",
                            },
                          },
                        ],
                      },
                    ],
                  },
                ],
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
                text: "If you come across a product that is not listed on this page but bears the Cybersecurity Label, please alert us immediately at ",
                type: "text",
                marks: [
                  {
                    type: "italic",
                  },
                ],
              },
              {
                text: "cls_iot@csa.gov.sg",
                type: "text",
                marks: [
                  {
                    type: "link",
                    attrs: {
                      rel: "",
                      href: "mailto:cls_iot@csa.gov.sg",
                      class: null,
                      target: "_self",
                    },
                  },
                  {
                    type: "italic",
                  },
                ],
              },
              {
                text: ".",
                type: "text",
                marks: [
                  {
                    type: "italic",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
};

module.exports = {
  getLinkSchema,
  getArticleSchema,
};

from utils import get_fees_with_gst

# Function for creating the "MOH Recommended Fees" section
# surg_fees, ann_fees and hosp_fees should contain upper and lower bounds, or null
# if not available
def get_moh_recommended_fees(surg_fees, ann_fees, hosp_fees):
  # Prepare output for this section
  moh_recommended_fees_content = []

  moh_recommended_fees_content.append({
    "type": "paragraph",
    "content": [
      {
        "type": "text",
        "marks": [],
        "text": "Fee Benchmarks "
      },
      {
        "type": "text",
        "marks": [
          {
            "type": "underline"
          }
        ],
        "text": "(for private hospitals & clinics only)"
      },
      {
        "type": "hardBreak"
      },
      {
        "type": "hardBreak"
      },
      {
        "type": "text",
        "marks": [],
        "text": "For this procedure/ condition, MOH recommends that a reasonable fee range for a routine and typical case is:"
      }
    ]
  })

  moh_recommended_fees_table_content = [
    {
      "type": "tableRow",
      "content": [
        {
          "type": "tableHeader",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Type of Fees"
                }
              ]
            }
          ],
          "attrs": {
            "colspan": 2
          }
        },
        {
          "type": "tableHeader",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Fee Range"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "tableRow",
      "content": [
        {
          "type": "tableCell",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "<b>Doctor Fees</b>"
                }
              ]
            }
          ],
          "attrs": {
            "rowspan": 4
          }
        }
      ]
    },
    {
      "type": "tableRow",
      "content": [
        {
          "type": "tableCell",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Surgeon Fee"
                },
                {
                  "type": "text",
                  "marks": [
                    {
                      "type": "superscript"
                    }
                  ],
                  "text": "1"
                }
              ]
            }
          ]
        },
        {
          "type": "tableCell",
          "content": [
            {
              "type": "paragraph",
              "content": get_fees_with_gst(surg_fees)
            }
          ]
        }
      ]
    },
    {
      "type": "tableRow",
      "content": [
        {
          "type": "tableCell",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Anaesthetist Fee"
                }
              ]
            }
          ]
        },
        {
          "type": "tableCell",
          "content": [
            {
              "type": "paragraph",
              "content": get_fees_with_gst(ann_fees)
            }
          ]
        }
      ]
    },
    {
      "type": "tableRow",
      "content": [
        {
          "type": "tableCell",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Inpatient Doctors’ Attendance Fees"
                },
                {
                  "type": "text",
                  "marks": [
                    {
                      "type": "superscript"
                    }
                  ],
                  "text": "2"
                }
              ]
            }
          ]
        },
        {
          "type": "tableCell",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "$230 - $450 w/GST per day"
                },
                {
                  "type": "hardBreak"
                },
                {
                  "type": "text",
                  "text": "($210 - $420 w/o GST per day)"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "tableRow",
      "content": [
        {
          "type": "tableCell",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "<b>Hospital Fees</b>"
                }
              ]
            }
          ]
        },
        {
          "type": "tableCell",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Hospital Fees"
                }
              ]
            }
          ]
        },
        {
          "type": "tableCell",
          "content": [
            {
              "type": "paragraph",
              "content": get_fees_with_gst(hosp_fees)
            }
          ]
        }
      ]
    },
    {
      "type": "tableRow",
      "content": [
        {
          "type": "tableCell",
          "attrs": {
            "colspan": 3
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "marks": [
                    {
                      "type": "superscript"
                    },
                    {
                      "type": "italic"
                    }
                  ],
                  "text": "1"
                },
                {
                  "type": "text",
                  "marks": [
                    {
                      "type": "italic"
                    }
                  ],
                  "text": " Higher end of surgeon fees may be associated with more complex cases."
                }
              ]
            },
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "marks": [
                    {
                      "type": "superscript"
                    },
                    {
                      "type": "italic"
                    }
                  ],
                  "text": "2"
                },
                {
                  "type": "text",
                  "marks": [
                    {
                      "type": "italic"
                    }
                  ],
                  "text": " Fee range is for office hours only and does not include the costs of medications, injections, operations, special procedures, investigations (e.g., radiological and laboratory tests)."
                }
              ]
            }
          ]
        }
      ]
    }
  ]

  moh_recommended_fees_content.append({
    "type": "table",
    "attrs": {
      "caption": "Breakdown of Fees"
    },
    "content": moh_recommended_fees_table_content
  })

  return moh_recommended_fees_content

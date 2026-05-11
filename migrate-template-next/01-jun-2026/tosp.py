import json
import os
import pandas as pd

from tosp_hospital_bill_overall import get_hospital_bill_overall
from tosp_hospital_bill_by_hospital import get_hospital_bill_by_hospital
from tosp_moh_recommended_fees import get_moh_recommended_fees

# Configuration variables
# This is the TOSP bill data CSV file
TOSP_BILL_DATA_CSV = "fee-publication-data-tosp.csv"
# This is the TOSP hospital-level data CSV file
TOSP_HOSPITAL_LEVEL_DATA_CSV = "fee-publication-data-tosp-hospital-level.csv"
# This is the fee benchmarks data CSV file (surgeon fees)
TOSP_FEE_BENCHMARKS_SURGEON_CSV = "test-fee-benchmarks-surgeon.csv"
# This is the fee benchmarks data CSV file (hospital fees)
TOSP_FEE_BENCHMARKS_HOSPITAL_CSV = "fee-benchmarks-hospital.csv"
# This is the output directory for the generated JSON files
OUTPUT_DIRECTORY = "output-tosp"

blacklistTOSP = [
    "SA828B", "SA830B", "SA852S", "SA902S",
    "SB700U", "SB701L", "SB701P", "SB702L", "SB702P",
    "SB703L", "SB728F", "SB729F", "SB730F", "SB731F",
    "SB803P", "SB804P", "SB805L", "SB809S",
    "SD707H", "SD708H", "SD734H", "SD832H",
    "SI707F", "SI802O", "SI803O", "SI804F", "SI804U",
    "SI805U", "SI812U"
]

######## Do not touch below this line unless you know what you are doing #######
NO_RECORD_PARAGRAPH = {
  "type": "paragraph",
  "content": [
    {"type": "text", "marks": [{"type": "italic"}], "text": "No record found."},
    {"type": "text", "marks": [], "text": " Contact your healthcare provider if you have questions on your hospital bill."}
  ]
}

# Function for creating a page for a specific TOSP code
def create_tosp_page(tosp_code, tosp_records, tosp_by_hospital, surg_ann_records, hosp_records, ogp_action):
  # Step 1: Create the page description
  # Take the first record to extract the common information
  # print(surg_ann_records)
  print(tosp_code)
  first_record = surg_ann_records[0]
   
  body_parts = [p for p in (str(first_record['Updated Body Part 1']).strip(), str(first_record['Updated Body Part 2']).strip()) if p not in ('', '-')]

  if (len(body_parts) == 0):
    body_parts = ["Untagged"]

  try:
    summary = tosp_records[0]['TOSP Description']
  except:
    summary = " "

  output_file = f"{OUTPUT_DIRECTORY}/tosp-{tosp_code.replace(">", "more-than-").replace("≤", "less-than-").replace("<=", "less-than-").replace(">=", "more-than-")}-bill-information.json".lower().replace("_", "-")
  output = {
    "version": "0.1.0",
    "page": {
      "title": first_record['Current TOSP code'] + " - " + first_record['Updated Description'],
      "category": "TOSP",
      "articlePageHeader": {
        "summary": f"{summary if summary != " " else surg_ann_records[0]['Updated Description']}"
      },
      "tags": [
        {
          "category": "Body parts",
          "selected": body_parts
        }
      ]
    },
    "layout": "article",
    "content": [
      {
        "type": "prose",
        "content": [
          {
            "type": "heading",
            "attrs": {
              "level": 2
            },
            "content": [
              {
                "type": "text",
                "marks": [],
                "text": "TOSP Code: " + first_record['Current TOSP code'] + " / TOSP Table: " + first_record['Updated TOSP table']
              }
            ]
          }
        ]
      }
    ]
  }

  action = str(ogp_action).strip().upper()
  is_remove = action == "REMOVE"
  is_create_new = action == "CREATE NEW PAGE"
  hide_hospital_bill = is_remove or is_create_new

  # Step 2: Create the "Hospital Bill (Overall)" section
  if hide_hospital_bill:
    output['content'].append({
      "type": "accordion",
      "summary": "Hospital Bill (Overall)",
      "details": {
        "type": "prose",
        "content": [NO_RECORD_PARAGRAPH]
      }
    })
  else:
    hospital_bill_overall_content = get_hospital_bill_overall(tosp_records)
    if (len(hospital_bill_overall_content) > 0):
      output['content'].append({
        "type": "accordion",
        "summary": "Hospital Bill (Overall)",
        "details": {
          "type": "prose",
          "content": hospital_bill_overall_content
        }
      })

  # Step 3: Create the "Hospital Bill (by Hospital)" section
  if hide_hospital_bill:
    output['content'].append({
      "type": "accordion",
      "summary": "Hospital Bill (by Hospital)",
      "details": {
        "type": "prose",
        "content": [NO_RECORD_PARAGRAPH]
      }
    })
  else:
    hospital_bill_by_hospital_content = get_hospital_bill_by_hospital(tosp_by_hospital)
    if (len(hospital_bill_by_hospital_content) > 0):
      output['content'].append({
        "type": "accordion",
        "summary": "Hospital Bill (by Hospital)",
        "details": {
          "type": "prose",
          "content": hospital_bill_by_hospital_content
        }
      })
    else:
      output['content'].append({
        "type": "accordion",
        "summary": "Hospital Bill (by Hospital)",
        "details": {
          "type": "prose",
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "marks": [
                    {
                      "type": "underline"
                    }
                  ],
                  "text": "No records found. Only hospitals/ wards with sufficient cases are shown."
                }
              ]
            },
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "marks": [],
                  "text": "Contact your healthcare provider if you have questions on your hospital bill."
                }
              ]
            }
          ]
        }
      })

  # Step 4: Create the "MOH Recommended Fees" section
  surg_fees = None if len(surg_ann_records) == 0 or surg_ann_records[0]['Surgeon Lower bound'] in ('-', '', 'Removed')else {
    "Lower bound": surg_ann_records[0]['Surgeon Lower bound'],
    "Upper bound": surg_ann_records[0]['Surgeon Upper bound']
  }
  ann_fees = None if len(surg_ann_records) == 0 or surg_ann_records[0]['Anaesthetist Lower bound'] in ('-', '', 'Removed') else {
    "Lower bound": surg_ann_records[0]['Anaesthetist Lower bound'],
    "Upper bound": surg_ann_records[0]['Anaesthetist Upper bound']
  }
  hosp_fees = None if is_create_new or len(hosp_records) == 0 or hosp_records[0]['Lower bound'] in ('-', '', 'Removed') else {
    "Lower bound": hosp_records[0]['Lower bound'],
    "Upper bound": hosp_records[0]['Upper bound']
  }

  moh_recommended_fees_content = get_moh_recommended_fees(first_record, surg_fees, ann_fees, hosp_fees)
  output['content'].append({
    "type": "accordion",
    "summary": "MOH Recommended Fees",
    "details": {
      "type": "prose",
      "content": moh_recommended_fees_content
    }
  })

  # # Step 5: Create the explanatory notes section
  output['content'].append({
    "type": "prose",
    "content": [
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "marks": [
              {
                "type": "bold"
              }
            ],
            "text": "Talk to your insurer to find out what your insurance covers and how much you have to pay out-of-pocket. Contact your healthcare provider if you have questions on your hospital bill."
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
                "type": "bold"
              }
            ],
            "text": "Download "
          },
          {
            "type": "text",
            "marks": [
              {
                "type": "link",
                "attrs": {
                  "href": "https://isomer-user-content.by.gov.sg/3/f9cba44d-6757-4b0a-a374-e8574ee06d8e/fee-publication-data-jan22-dec22-(for-download).xlsx"
                }
              },
              {
                "type": "bold"
              }
            ],
            "text": "all hospital bill amounts [XLSX, 1.2 MB]" 
          },
          {
            "type": "text",
            "marks": [
              {
                "type": "bold"
              }
            ],
            "text": " in excel."
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
                "type": "bold"
              }
            ],
            "text": "Download full list of fee benchmarks in "
          },
          {
            "type": "text",
            "marks": [
              {
                "type": "link",
                "attrs": {
                  "href": "https://isomer-user-content.by.gov.sg/3/e668bb73-1c46-45b5-b644-8ac67df4a43d/MOH-Fee-Benchmarks-(wef-1-Jan-2025)-Publication.pdf"
                }
              },
              {
                "type": "bold"
              }
            ],
            "text": "PDF version [PDF, 2.5 MB]" 
          },
          {
            "type": "text",
            "marks": [
              {
                "type": "bold"
              }
            ],
            "text": " or "
          },
          {
            "type": "text",
            "marks": [
              {
                "type": "link",
                "attrs": {
                  "href": "https://go.gov.sg/feebenchmarks"
                }
              },
              {
                "type": "bold"
              }
            ],
            "text": "Excel version" 
          },
          {
            "type": "text",
            "marks": [
              {
                "type": "bold"
              }
            ],
            "text": "."
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
                "type": "bold"
              }
            ],
            "text": "Find out more about "
          },
          {
            "type": "text",
            "marks": [
              {
                "type": "link",
                "attrs": {
                  "href": "/managing-expenses/bills-and-fee-benchmarks/hospital-bills-and-fee-benchmarks/"
                }
              },
              {
                "type": "bold"
              }
            ],
            "text": "fee benchmarks and how to use them"
          },
          {
            "type": "text",
            "marks": [],
            "text": "."
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
                "type": "bold"
              }
            ],
            "text": "Note:"
          }
        ]
      },
      {
        "type": "orderedList",
        "content": [
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  {
                    "type": "text",
                    "marks": [],
                    "text": "‘-’ denotes data is not available. ‘n/a’ denotes data with less than 10 cases. To ensure that there are adequate cases for meaningful comparisons, bill amounts for setting with less than 10 cases will not be shown."
                  }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  {
                    "type": "text",
                    "marks": [],
                    "text": "The typical bill items shown for public and private hospitals differ due to their different cost structures."
                  }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  {
                    "type": "text",
                    "marks": [],
                    "text": "Some components of the hospital fees may be charged by the doctor. E.g., implants, consumables and medication."
                  }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  {
                    "type": "text",
                    "marks": [],
                    "text": "Bill amounts are inclusive of GST and are before insurance (e.g., MediShield Life, Integrated Shield Plans) and MediSave payouts. Bill amounts for public hospitals are after Government subsidies, if applicable."
                  }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  {
                    "type": "text",
                    "marks": [],
                    "text": "Bill amounts are based on actual transacted fees for Singapore Citizens. The typical bill refers to the median bill, where 50% of the patients are charged below the stated amount. The typical range refers to the 25th to 75th percentile bill, where 25% to 75% of patients are charged below the stated amount. The range of days refer to the 25th to 75th percentile of the length of stay."
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  })

  # Step 6: Write the output to the JSON file
  with open(output_file, 'w') as file:
    json.dump(output, file, indent=2)

  # Step 7: If the row carries a TOSP-code rename (Current != Updated),
  # rename the file in place and overwrite its title with the updated code.
  updated_code = str(first_record.get('Updated TOSP code', '')).strip()
  if updated_code and updated_code != tosp_code:
    new_output_file = f"{OUTPUT_DIRECTORY}/tosp-{updated_code.replace('>', 'more-than-').replace('≤', 'less-than-').replace('<=', 'less-than-').replace('>=', 'more-than-')}-bill-information.json".lower().replace("_", "-")
    if new_output_file != output_file:
      os.rename(output_file, new_output_file)
    output["page"]["title"] = updated_code + " - " + first_record['Updated Description']
    with open(new_output_file, 'w') as file:
      json.dump(output, file, indent=2)

# Main entry point of the script
def main():
  df = pd.read_csv(TOSP_BILL_DATA_CSV)
  records = df.fillna('').to_dict(orient='records')
  by_hospital_df = pd.read_csv(TOSP_HOSPITAL_LEVEL_DATA_CSV)
  by_hospital = by_hospital_df.fillna('').to_dict(orient='records')
  surg_ann_df = pd.read_csv(TOSP_FEE_BENCHMARKS_SURGEON_CSV)
  surg_ann_fees = surg_ann_df.fillna('').to_dict(orient='records')
  hosp_df = pd.read_csv(TOSP_FEE_BENCHMARKS_HOSPITAL_CSV)
  hosp_fees = hosp_df.fillna('').to_dict(orient='records')

  # Step 1: Build the universe of TOSP codes from the surgeon fee CSV only.
  # That CSV is the sole authority for which pages get generated.
  surg_lookup = {}
  for record in surg_ann_fees:
    code = record['Current TOSP code']
    if code:
      surg_lookup[code] = record
  tosp_codes = set(surg_lookup.keys())

  print("Number of TOSP codes:", len(tosp_codes))

  # Step 2: Create the page for each TOSP code
  for tosp_code in tosp_codes:
    if tosp_code in blacklistTOSP:
      print("Blacklisted:", tosp_code)
      continue

    tosp_records = [record for record in records if record['TOSP Code'] == tosp_code]
    tosp_by_hospital = [record for record in by_hospital if record['TOSP code'] == tosp_code]
    surg_ann_records = [surg_lookup[tosp_code]]
    hosp_records = [record for record in hosp_fees if record['TOSP'] == tosp_code]
    ogp_action = surg_lookup[tosp_code]["For OGP's Action (Remove/Retain Hospital Bill Size)"]

    create_tosp_page(tosp_code, tosp_records, tosp_by_hospital, surg_ann_records, hosp_records, ogp_action)

if __name__ == "__main__":
    main()

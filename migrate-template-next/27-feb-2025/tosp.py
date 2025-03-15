import json
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
TOSP_FEE_BENCHMARKS_SURGEON_CSV = "fee-benchmarks-surgeon.csv"
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
# Function for creating a page for a specific TOSP code
def create_tosp_page(tosp_code, tosp_records, tosp_by_hospital, surg_ann_records, hosp_records):
  # Step 1: Create the page description
  # Take the first record to extract the common information
  print(tosp_code)
  print(surg_ann_records)
  first_record = surg_ann_records[0]
   
  body_parts = [str(part).strip() for part in [first_record['Body Part 1'], first_record['Body Part 2']] if part != '']

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
      "title": first_record['TOSP'] + " - " + first_record['Description'],
      "category": "TOSP",
      "articlePageHeader": {
        "summary": f"{summary if summary != " " else surg_ann_records[0]['Description']}"
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
                "text": "TOSP Code: " + first_record['TOSP'] + " / TOSP Table: " + first_record['Table No.']
              }
            ]
          }
        ]
      }
    ]
  }

  # # Step 2: Create the "Hospital Bill (Overall)" section
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
  surg_fees = None if len(surg_ann_records) == 0 else {
    "Lower bound": surg_ann_records[0]['Surgeon Lower bound'],
    "Upper bound": surg_ann_records[0]['Surgeon Upper bound']
  }
  ann_fees = None if len(surg_ann_records) == 0 else {
    "Lower bound": surg_ann_records[0]['Anaesthetist Lower bound'],
    "Upper bound": surg_ann_records[0]['Anaesthetist Upper bound']
  }
  hosp_fees = None if len(hosp_records) == 0 else {
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
                  "href": "https://isomer-user-content.by.gov.sg/3/a7305a12-e9c2-4d88-ad13-ed753d054416/MOH-Fee-Benchmarks-(wef-1-Jan-2025)-Publication.xlsx"
                }
              },
              {
                "type": "bold"
              }
            ],
            "text": "Excel version [XLSX, 209 KB]" 
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
    # print("Saving to file:", output_file)
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

  # Step 1: Find the universe of TOSP codes
  # Get the set of all records under the TOSP column
  tosp_codes = set()

  # Replace "SH808P_(>6mth)" -> "SH808P>6M", "SH808P_(≤6mth)" -> "SH808P<=6M")

  for record in surg_ann_fees:
    tosp_codes.add(record['TOSP'])

  for record in records:
    tosp_codes.add(record['TOSP Code'])

  print("Number of TOSP codes:", len(tosp_codes))
  # print("Number of new TOSP codes:", len(new_tosp_codes))

  # Step 2: Create the page for each TOSP code
  for tosp_code in tosp_codes:
    # Filter the records for the current TOSP code
    # print(tosp_code)
    tosp_records = [record for record in records if record['TOSP Code'] == tosp_code]
    tosp_by_hospital = [record for record in by_hospital if record['TOSP code'] == tosp_code]
    surg_ann_records = [record for record in surg_ann_fees if record['TOSP'] == tosp_code]
    hosp_records = [record for record in hosp_fees if record['TOSP'] == tosp_code]

    # Create the TOSP page
    if tosp_code not in blacklistTOSP:
      create_tosp_page(tosp_code, tosp_records, tosp_by_hospital, surg_ann_records, hosp_records)
    else:
      print("Blacklisted:", tosp_code)
      continue

if __name__ == "__main__":
    main()

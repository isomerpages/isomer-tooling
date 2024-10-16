import json
import pandas as pd

from drg_hospital_bill_overall import get_hospital_bill_overall
from drg_hospital_bill_by_hospital import get_hospital_bill_by_hospital

# Configuration variables
# This is the DRG overall data CSV file
DRG_OVERALL_DATA_CSV = "drg-overall.csv"
# This is the DRG hospital-level data CSV file
DRG_HOSPITAL_LEVEL_DATA_CSV = "drg-hospital-level.csv"
# This is the output directory for the generated JSON files
OUTPUT_DIRECTORY = "output-drg"

######## Do not touch below this line unless you know what you are doing #######
# Function for creating a page for a specific DRG code
def create_drg_page(drg_code, drg_records, drg_by_hospital):
  # Step 1: Create the page description
  # Take the first record to extract the common information
  first_record = drg_records[0]
  body_parts = [str(part).strip() for part in [first_record['Body Part 1'], first_record['Body Part 2'], first_record['Body Part 3']] if part != '']

  if (len(body_parts) == 0):
    body_parts = ["Untagged"]

  for body_part in body_parts:
    output_file = f"{OUTPUT_DIRECTORY}/drg-{drg_code.replace(">", "more-than-").replace("≤", "less-than-")}-{body_part.replace("/", "-").replace(" ", "-").replace(",", "")}-bill-information.json".lower().replace("_", "-")
    output = {
      "version": "0.1.0",
      "page": {
        "title": first_record['DRG'] + " - " + first_record['DRG Description'],
        "category": body_part,
        "articlePageHeader": {
          "summary": [
            first_record['DRG Description']
          ]
        }
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
                  "text": "DRG Code: " + first_record['DRG']
                }
              ]
            }
          ]
        }
      ]
    }

    # Step 2: Create the "Hospital Bill (Overall)" section
    hospital_bill_overall_content = get_hospital_bill_overall(drg_records)

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
    hospital_bill_by_hospital_content = get_hospital_bill_by_hospital(drg_by_hospital)

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

    # Step 4: Create the explanatory notes section
    output['content'].append({
      "type": "prose",
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "marks": [],
              "text": "<b>Talk to your insurer to find out what your insurance covers and how much you have to pay out-of-pocket. Contact your healthcare provider if you have questions on your hospital bill.</b>"
            }
          ]
        },
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "marks": [],
              "text": "<b>Download <a href='/files/managing-medical-expenses/fees-benchmark/fee-publication-data-jan22-dec22-(for-download).xlsx'>all hospital bill amounts [XLXS, 1.2 MB]</a> in excel.</b>"
            }
          ]
        },
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "marks": [],
              "text": "<b>Download full list of fee benchmarks in <a href='/files/managing-medical-expenses/fees-benchmark/full-list-of-fee-benchmarks_010424.pdf'>PDF version [PDF, 2.5 MB]</a> or <a href='/files/managing-medical-expenses/fees-benchmark/full-list-of-fee-benchmarks-(wef-1-april-2024).xlsx'>Excel version [XLXS, 209 KB]</a>.</b>"
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
                    "href": "/managing-expenses/bills-and-fee-benchmarks/hospital-bills-and-fee-benchmarks"
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
              "marks": [],
              "text": "<b>Note:</b>"
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

    # Step 5: Write the output to the JSON file
    with open(output_file, 'w') as file:
      # print("Saving to file:", output_file)
      json.dump(output, file, indent=2)

# Main entry point of the script
def main():
  df = pd.read_csv(DRG_OVERALL_DATA_CSV)
  records = df.fillna('').to_dict(orient='records')
  by_hospital_df = pd.read_csv(DRG_HOSPITAL_LEVEL_DATA_CSV)
  by_hospital = by_hospital_df.fillna('').to_dict(orient='records')

  # Step 1: Find the universe of DRG codes
  # Get the set of all records under the DRG column
  drg_codes = set()
  for record in records:
    drg_codes.add(record['DRG'])

  print("Number of DRG codes:", len(drg_codes))

  # Step 2: Create the page for each DRG code
  for drg_code in drg_codes:
    # Filter the records for the current DRG code
    drg_records = [record for record in records if record['DRG'] == drg_code]
    drg_by_hospital = [record for record in by_hospital if record['DRG'] == drg_code]

    # Create the TOSP page
    create_drg_page(drg_code, drg_records, drg_by_hospital)

if __name__ == "__main__":
    main()

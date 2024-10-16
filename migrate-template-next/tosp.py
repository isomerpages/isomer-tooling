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

######## Do not touch below this line unless you know what you are doing #######
# Function for creating a page for a specific TOSP code
def create_tosp_page(tosp_code, tosp_records, tosp_by_hospital, surg_ann_records, hosp_records):
  # Step 1: Create the page description
  # Take the first record to extract the common information
  first_record = tosp_records[0]
  body_parts = [str(part).strip() for part in [first_record['Body Part 1'], first_record['Body Part 2'], first_record['Body Part 3']] if part != '']

  if (len(body_parts) == 0):
    body_parts = ["Untagged"]

  for body_part in body_parts:
    output_file = f"{OUTPUT_DIRECTORY}/tosp-{tosp_code.replace(">", "more-than-").replace("≤", "less-than-")}-{body_part.replace("/", "-").replace(" ", "-").replace(",", "")}-bill-information.json".lower().replace("_", "-")
    output = {
      "version": "0.1.0",
      "page": {
        "title": first_record['TOSP Code'] + " - " + first_record['TOSP Description'],
        "category": body_part,
        "articlePageHeader": {
          "summary": [
            first_record['TOSP Common name']
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
                  "text": "TOSP Code: " + first_record['TOSP Code'] + " / TOSP Table: " + first_record['TOSP table no.']
                }
              ]
            }
          ]
        }
      ]
    }

    # Step 2: Create the "Hospital Bill (Overall)" section
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
    moh_recommended_fees_content = get_moh_recommended_fees(surg_fees, ann_fees, hosp_fees)
    output['content'].append({
      "type": "accordion",
      "summary": "MOH Recommended Fees",
      "details": {
        "type": "prose",
        "content": moh_recommended_fees_content
      }
    })

    # Step 5: Create the explanatory notes section
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
  for record in records:
    tosp_codes.add(record['TOSP Code'])

  print("Number of TOSP codes:", len(tosp_codes))

  # Step 2: Create the page for each TOSP code
  for tosp_code in tosp_codes:
    # Filter the records for the current TOSP code
    tosp_records = [record for record in records if record['TOSP Code'] == tosp_code]
    tosp_by_hospital = [record for record in by_hospital if record['TOSP code'] == tosp_code]
    surg_ann_records = [record for record in surg_ann_fees if record['TOSP'] == tosp_code]
    hosp_records = [record for record in hosp_fees if record['TOSP'] == tosp_code]

    # Create the TOSP page
    create_tosp_page(tosp_code, tosp_records, tosp_by_hospital, surg_ann_records, hosp_records)

if __name__ == "__main__":
    main()

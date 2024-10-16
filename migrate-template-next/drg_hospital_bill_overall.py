from utils import replace_na

# Function for creating the "Hospital Bill (Overall)" section
def get_hospital_bill_overall(records):
  # Get the Day Surgery records
  public_day_surgery_records = [record for record in records if 'Day Surgery ' in record['Ward Type']]
  private_day_surgery_records = [record for record in records if record['Ward Type'] == 'Day Surgery']

  # Get the Inpatient records
  public_inpatient_records = [record for record in records if record['Ward Type'] in ['Ward A', 'Ward B1', 'Ward B2', 'Ward C']]
  private_inpatient_records = [record for record in records if record['Ward Type'] == 'Inpatient']

  if len(public_day_surgery_records) + len(private_day_surgery_records) + len(public_inpatient_records) + len(private_inpatient_records) == 0:
    # Do nothing since there are no records
    return []

  # Prepare output for this section
  hospital_bill_overall_content = []

  hospital_bill_overall_content.append({
    "type": "paragraph",
    "content": [
      {
        "type": "text",
        "marks": [],
        "text": "Based on transacted bills from 1 January 2022 to 31 December 2022. The amount shown covers all cost components inclusive of GST."
      }
    ]
  })

  # Add day surgery section
  if (len(public_day_surgery_records) + len(private_day_surgery_records)) > 0:
    hospital_bill_overall_content.append({
      "type": "heading",
      "attrs": {
        "level": 3
      },
      "content": [
        {
          "type": "text",
          "marks": [],
          "text": "Day Surgery"
        }
      ]
    })
    hospital_bill_day_surgery_content = [{
      "type": "tableRow",
      "content": [
        {
          "type": "tableHeader",
          "attrs": {
            "colspan": 1,
            "rowspan": 1,
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Settings"
                }
              ]
            }
          ]
        },
        {
          "type": "tableHeader",
          "attrs": {
            "colspan": 1,
            "rowspan": 1,
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Ward Type"
                }
              ]
            }
          ]
        },
        {
          "type": "tableHeader",
          "attrs": {
            "colspan": 1,
            "rowspan": 1,
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Typical Bill"
                }
              ]
            }
          ]
        },
        {
          "type": "tableHeader",
          "attrs": {
            "colspan": 1,
            "rowspan": 1,
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Typical Bill Range"
                }
              ]
            }
          ]
        }
      ]
    }]

    for record in public_day_surgery_records:
      table_row = []

      if (len(hospital_bill_day_surgery_content) == 1):
        table_row.append({
          "type": "tableCell",
          "attrs": {
            "colspan": 1,
            "rowspan": len(public_day_surgery_records),
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Public Hospitals"
                }
              ]
            }
          ]
        })

      table_row.extend([
        {
          "type": "tableCell",
          "attrs": {
            "colspan": 1,
            "rowspan": 1,
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": record['Ward Type']
                }
              ]
            }
          ]
        },
        {
          "type": "tableCell",
          "attrs": {
            "colspan": 1,
            "rowspan": 1,
          },
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
                  "text": "$" + record['P50 Bill']
                }
              ]
            }
          ]
        },
        {
          "type": "tableCell",
          "attrs": {
            "colspan": 1,
            "rowspan": 1,
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "$" + record['P25 Bill'] + " - $" + record['P75 Bill']
                }
              ]
            }
          ]
        }
      ])

      hospital_bill_day_surgery_content.append({
        "type": "tableRow",
        "content": table_row
      })

    for record in private_day_surgery_records:
      table_row = []

      if (len(hospital_bill_day_surgery_content) - len(public_day_surgery_records) == 1):
        table_row.append({
          "type": "tableCell",
          "attrs": {
            "colspan": 1,
            "rowspan": len(private_day_surgery_records),
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Private Hospitals"
                }
              ]
            }
          ]
        })

      table_row.extend([
        {
          "type": "tableCell",
          "attrs": {
            "colspan": 1,
            "rowspan": 1,
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": record['Ward Type']
                }
              ]
            }
          ]
        },
        {
          "type": "tableCell",
          "attrs": {
            "colspan": 1,
            "rowspan": 1,
          },
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
                  "text": "$" + record['P50 Bill']
                }
              ]
            }
          ]
        },
        {
          "type": "tableCell",
          "attrs": {
            "colspan": 1,
            "rowspan": 1,
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "$" + record['P25 Bill'] + " - $" + record['P75 Bill']
                }
              ]
            }
          ]
        }
      ])

      hospital_bill_day_surgery_content.append({
        "type": "tableRow",
        "content": table_row
      })

    hospital_bill_day_surgery_content.append({
      "type": "tableRow",
      "content": [
        {
          "type": "tableCell",
          "attrs": {
            "colspan": 4
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Note: Figures shown are based on the median fee, i.e., what 50% of patients are charged below. They provide an estimate and may not add up."
                }
              ]
            }
          ]
        }
      ]
    })

    hospital_bill_overall_content.append({
      "type": "table",
      "attrs": {
        "caption": "Day Surgery: Refers to operations done in the hospital, with a stay of less than 24 hours."
      },
      "content": hospital_bill_day_surgery_content
    })

  # Add inpatient section
  if (len(public_inpatient_records) + len(private_inpatient_records)) > 0:
    hospital_bill_overall_content.append({
      "type": "heading",
      "attrs": {
        "level": 3
      },
      "content": [
        {
          "type": "text",
          "marks": [],
          "text": "Inpatient"
        }
      ]
    })
    hospital_bill_inpatient_content = [{
      "type": "tableRow",
      "content": [
        {
          "type": "tableHeader",
          "attrs": {
            "colspan": 1,
            "rowspan": 1,
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Setting"
                }
              ]
            }
          ]
        },
        {
          "type": "tableHeader",
          "attrs": {
            "colspan": 1,
            "rowspan": 1,
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Ward Type"
                }
              ]
            }
          ]
        },
        {
          "type": "tableHeader",
          "attrs": {
            "colspan": 1,
            "rowspan": 1,
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Typical Bill"
                }
              ]
            }
          ]
        },
        {
          "type": "tableHeader",
          "attrs": {
            "colspan": 1,
            "rowspan": 1,
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Typical Bill Range"
                }
              ]
            }
          ]
        }
      ]
    }]

    for record in public_inpatient_records:
      table_row = []

      if (len(hospital_bill_inpatient_content) == 1):
        table_row.append({
          "type": "tableCell",
          "attrs": {
            "colspan": 1,
            "rowspan": len(public_inpatient_records),
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Public Hospitals"
                }
              ]
            }
          ]
        })

      table_row.extend([
        {
          "type": "tableCell",
          "attrs": {
            "colspan": 1,
            "rowspan": 1,
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": record['Ward Type']
                }
              ]
            }
          ]
        },
        {
          "type": "tableCell",
          "attrs": {
            "colspan": 1,
            "rowspan": 1,
          },
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
                  "text": "$" + record['P50 Bill']
                }
              ]
            }
          ]
        },
        {
          "type": "tableCell",
          "attrs": {
            "colspan": 1,
            "rowspan": 1,
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "$" + record['P25 Bill'] + " - $" + record['P75 Bill']
                }
              ]
            }
          ]
        }
      ])

      hospital_bill_inpatient_content.append({
        "type": "tableRow",
        "content": table_row
      })

    for record in private_inpatient_records:
      table_row = []

      if (len(hospital_bill_inpatient_content) - len(public_inpatient_records) == 1):
        table_row.append({
          "type": "tableCell",
          "attrs": {
            "colspan": 1,
            "rowspan": len(private_inpatient_records),
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Private Hospitals"
                }
              ]
            }
          ]
        })

      table_row.extend([
        {
          "type": "tableCell",
          "attrs": {
            "colspan": 1,
            "rowspan": 1,
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": record['Ward Type']
                }
              ]
            }
          ]
        },
        {
          "type": "tableCell",
          "attrs": {
            "colspan": 1,
            "rowspan": 1,
          },
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
                  "text": "$" + record['P50 Bill']
                }
              ]
            }
          ]
        },
        {
          "type": "tableCell",
          "attrs": {
            "colspan": 1,
            "rowspan": 1,
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "$" + record['P25 Bill'] + " - $" + record['P75 Bill']
                }
              ]
            }
          ]
        }
      ])

      hospital_bill_inpatient_content.append({
        "type": "tableRow",
        "content": table_row
      })

    hospital_bill_inpatient_content.append({
      "type": "tableRow",
      "content": [
        {
          "type": "tableCell",
          "attrs": {
            "colspan": 4
          },
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Note: Figures shown are based on the median fee, i.e., what 50% of patients are charged below. They provide an estimate and may not add up."
                }
              ]
            }
          ]
        }
      ]
    })

    hospital_bill_overall_content.append({
      "type": "table",
      "attrs": {
        "caption": "Inpatient: Refers to operations done in the hospital, with a stay of more than 24 hours."
      },
      "content": hospital_bill_inpatient_content
    })

  return hospital_bill_overall_content

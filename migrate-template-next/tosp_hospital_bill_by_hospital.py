HOSPITAL_MAP = {
  "ADMC": "Admiralty Medical Centre",
  "AH": "Alexandra Hospital",
  "CGH": "Changi General Hospital",
  "FPH": "Farrer Park Hospital",
  "GEH": "Gleneagles Hospital",
  "JMC": "Jurong Medical Centre",
  "KKH": "KK Women's and Children's Hospital",
  "KTPH": "Khoo Teck Puat Hospital",
  "MAH": "Mount Alvernia Hospital",
  "MEH": "Mount Elizabeth Hospital",
  "MNH": "Mount Novena Hospital",
  "NCC": "National Cancer Centre",
  "NHC": "National Heart Centre",
  "NSC": "National Skin Centre",
  "NTFGH": "Ng Teng Fong General Hospital",
  "NUH": "National University Hospital",
  "PEH": "Parkway East Hospital",
  "RH": "Raffles Hospital",
  "SGH": "Singapore General Hospital",
  "SKH": "Sengkang General Hospital",
  "SNEC": "Singapore National Eye Centre",
  "TMC": "Thomson Medical Centre",
  "TTSH": "Tan Tock Seng Hospital"
}

# Function for creating the "Hospital Bill (Overall)" section
def get_hospital_bill_by_hospital(records):
  # Get the Day Surgery records
  day_surgery_records = [record for record in records if 'Day Surgery' in record['Ward Type']]
  # Get the Inpatient records
  inpatient_records = [record for record in records if 'Day Surgery' not in record['Ward Type']]

  if len(day_surgery_records) + len(inpatient_records) == 0:
    # Do nothing since there are no records
    return []

  # Prepare output for this section
  hospital_bill_by_hospital_content = []

  hospital_bill_by_hospital_content.append({
    "type": "paragraph",
    "content": [
      {
        "type": "text",
        "marks": [],
        "text": "Based on transacted bills from 1 January 2022 to 31 December 2022. The amount shown covers all cost components inclusive of GST. Only hospitals / wards with sufficient cases are shown. The amount shown covers all cost component inclusive of GST."
      }
    ]
  })

  # Add day surgery section
  if len(day_surgery_records) > 0:
    hospital_bill_by_hospital_content.append({
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
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Hospital"
                }
              ]
            }
          ]
        },
        {
          "type": "tableHeader",
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
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Average Period of Stay"
                }
              ]
            }
          ]
        },
        {
          "type": "tableHeader",
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

    for record in day_surgery_records:
      hospital_bill_day_surgery_content.append({
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
                    "text": HOSPITAL_MAP[record['Hospital']]
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
                    "text": record['Setting']
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
                    "text": record['Ward Type']
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
                    "text": str(record['Average Length of Stay'])
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
        ]
      })

    hospital_bill_day_surgery_content.append({
      "type": "tableRow",
      "content": [
        {
          "type": "tableCell",
          "attrs": {
            "colspan": 6
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

    hospital_bill_by_hospital_content.append({
      "type": "table",
      "attrs": {
        "caption": "Day Surgery: Refers to operations done in the hospital, with a stay of less than 24 hours."
      },
      "content": hospital_bill_day_surgery_content
    })

  # Add inpatient section
  if len(inpatient_records) > 0:
    hospital_bill_by_hospital_content.append({
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
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Hospital"
                }
              ]
            }
          ]
        },
        {
          "type": "tableHeader",
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
          "content": [
            {
              "type": "paragraph",
              "content": [
                {
                  "type": "text",
                  "text": "Average Period of Stay"
                }
              ]
            }
          ]
        },
        {
          "type": "tableHeader",
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

    for record in inpatient_records:
      hospital_bill_inpatient_content.append({
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
                    "text": HOSPITAL_MAP[record['Hospital']]
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
                    "text": record['Setting']
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
                    "text": record['Ward Type']
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
                    "text": str(record['Average Length of Stay'])
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
        ]
      })

    hospital_bill_inpatient_content.append({
      "type": "tableRow",
      "content": [
        {
          "type": "tableCell",
          "attrs": {
            "colspan": 6
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

    hospital_bill_by_hospital_content.append({
      "type": "table",
      "attrs": {
        "caption": "Inpatient: Refers to operations done in the hospital, with a stay of more than 24 hours."
      },
      "content": hospital_bill_inpatient_content
    })

  return hospital_bill_by_hospital_content

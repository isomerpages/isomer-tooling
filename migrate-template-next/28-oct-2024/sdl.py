import json
import pandas as pd
import numpy as np

# Configuration variables
INPUT_FILE = 'sdl.xlsx'
OUTPUT_FILE = 'output-sdl.json'

######## Do not touch below this line unless you know what you are doing #######
def get_combined_string(current_value, new_value):
  if current_value is None:
    return new_value

  if new_value is None:
    return current_value

  return f"{current_value}<br /><br />{new_value}"

def main():
  # Read the input data from the Excel file
  df = pd.read_excel(INPUT_FILE).replace({np.nan: None})

  # Convert the data to a list of dictionaries
  records = df.to_dict(orient='records')

  result = []
  holding = None
  for record in records:
    if record['Active Ingredient(s)'] == 'Active Ingredient(s)':
      continue

    if record['Active Ingredient(s)'] != None:
      if holding:
        result.append([
          holding['Active Ingredient(s)'] if holding['Active Ingredient(s)'] else '',
          holding['Dosage Form'] if holding['Dosage Form'] else '',
          holding['Strength(s)'] if holding['Strength(s)'] else '',
          holding['Subsidy Class'] if holding['Subsidy Class'] else '',
          holding['Clinical Indication (where applicable)'] if holding['Clinical Indication (where applicable)'] else ''
        ])
      holding = record
    else:
      holding['Dosage Form'] = get_combined_string(holding['Dosage Form'], record['Dosage Form'])
      holding['Strength(s)'] = get_combined_string(holding['Strength(s)'], record['Strength(s)'])
      holding['Subsidy Class'] = get_combined_string(holding['Subsidy Class'], record['Subsidy Class'])
      holding['Clinical Indication (where applicable)'] = get_combined_string(holding['Clinical Indication (where applicable)'], record['Clinical Indication (where applicable)'])

  if holding:
    result.append([
      holding['Active Ingredient(s)'] if holding['Active Ingredient(s)'] else '',
      holding['Dosage Form'] if holding['Dosage Form'] else '',
      holding['Strength(s)'] if holding['Strength(s)'] else '',
      holding['Subsidy Class'] if holding['Subsidy Class'] else '',
      holding['Clinical Indication (where applicable)'] if holding['Clinical Indication (where applicable)'] else ''
    ])

  output = {
    "headers": ["Active Ingredient(s)", "Dosage Form", "Strength(s)", "Subsidy Class", "Clinical Indication (where applicable)"],
    "items": result
  }

  # Write the records to the output JSON file
  with open(OUTPUT_FILE, 'w') as file:
    json.dump(output, file, indent=2)

  # print(f"Data written to {OUTPUT_FILE}")

if __name__ == "__main__":
  main()

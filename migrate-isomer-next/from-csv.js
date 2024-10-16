// Script for creating the JSON schema files using the CSV file with defined fields
const Papa = require("papaparse");

// CONFIGURATION SETTINGS
const CSV_FILE = "input.csv";
const CSV_HEADERS = [
  "TOSP",
  "TOSP Description",
  "Table no.",
  "TOSP Common name",
  "Setting",
  "Ward Type",
  "Surg Lower Bound",
  "Surg Upper Bound",
  "Surg Lower Bound w GST",
  "Surg Upper Bound w GST",
  "Ana Lower Bound",
  "Ana Upper Bound",
  "Ana Lower Bound w GST",
  "Ana Upper Bound w GST",
  "Hosp Lower Bound 1",
  "Hosp Upper Bound 1 ",
  "Hosp Lower Bound 2",
  "Hosp Upper Bound 2",
  "Hosp Lower Bound 3",
  "Hosp Upper Bound 3",
  "Hosp Lower Bound 1 w GST",
  "Hosp Upper Bound 1 w GST",
  "Hosp Lower Bound 2 w GST",
  "Hosp Upper Bound 2 w GST",
  "Hosp Lower Bound 3 w GST",
  "Hosp Upper Bound 3 w GST",
  "P25 Bill",
  "P50 Bill",
  "P75 Bill",
  "P25 TOF",
  "P50 TOF",
  "P75 TOF",
  "P25 Surg Fee",
  "P50 Surg Fee",
  "P75 Surg Fee",
  "P25 Facility Fee",
  "P50 Facility Fee",
  "P75 Facility Fee",
  "P25 Anaes Fee",
  "P50 Anaes Fee",
  "P75 Anaes Fee",
  "P25 Implant Fee",
  "P50 Implant Fee",
  "P75 Implant Fee",
  "P25 Other Fee",
  "P50 Other Fee",
  "P75 Other Fee",
  "Explanatory note (on mouse-over)",
  "Anaesthetist Fee Explanatory note (on mouse-over)",
  "Hosp Fee Explantory note 1",
  "Hosp Fee Explantory note 2",
  "Hosp Fee Explantory note 3",
  "Total Bill Size tooltip",
  "TOSP category",
  "Ref code 1",
  "Ref code 2",
  "Ref code 3",
  "Editorial Status",
];
const JOIN_CSV_FILE = "join.csv";
const JOIN_CSV_HEADERS = [
  "TOSP",
  "TOSP Description",
  "Table no.",
  "With FB?",
  "Common name",
  "Body Part 1",
  "Body Part 2",
  "Body Part 3",
  "Specialty 1",
  "Specialty 2",
  "Specialty 3",
  "Specialty 4",
  "Specialty 5",
  "Volume",
  "Editorial Status",
];
const JOIN_COLUMN = "TOSP";

const main = async () => {
  const reportItems = [];

  // Step 0: Create the output directory. If it exists, delete it first
  try {
    await fs.rmdir("output", { recursive: true });
  } catch (error) {
    // Ignore error if directory doesn't exist
  }

  await fs.mkdir("output");

  // Step 1: Read the CSV files
  const csv = await fs.readFile(CSV_FILE, "utf-8");
  const joinCsv = await fs.readFile(JOIN_CSV_FILE, "utf-8");

  // Step 2: Parse the CSV files
  const csvParse = Papa.parse(csv, { header: true });
  const joinCsvParse = Papa.parse(joinCsv, { header: true });

  // Template: https://github.com/isomerpages/moh-corp-next/blob/staging/schema/archive/cost-financing/TOSP-bill-infomation-template.json
};

main();

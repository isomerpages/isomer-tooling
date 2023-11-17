exports.handler = async (event) => {
  const fs = require("fs");
  const path = require("path");
  const csv = require("csv-parser");
  const axios = require("axios");
  const crypto = require("crypto");
  const algoliasearch = require("algoliasearch");

  const appId = process.env.APP_ID;
  const apiKey = process.env.API_KEY;
  const indexName = process.env.INDEX_NAME;

  const csvFilePath = path.join(__dirname, "2023-dgs-datasets-edited.csv"); // Replace with your actual CSV file path
  const outputDir = path.join("/tmp", "2023-gazettes"); // Directory to save JSON files

  // Initialize Algolia client
  const client = algoliasearch(appId, apiKey);
  const index = client.initIndex(indexName);

  // Make sure the output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  async function addToAlgolia(data) {
    try {
      const content = await index.saveObjects(data, {
        autoGenerateObjectIDIfNotExist: true,
      });
      console.log(`Algolia content added: ${content.objectIDs.length} records`);
    } catch (error) {
      console.error("Error adding data to Algolia:", error);
    }
  }

  function toTimestamp(strDate) {
    const datum = new Date(strDate);
    return datum.getTime();
  }

  function hashRecord(record) {
    const recordString = JSON.stringify(record);
    return crypto.createHash("sha256").update(recordString).digest("hex");
  }

  async function fetchDataFromAPI(domain, resourceId) {
    let records = [];
    let url = `${domain}/api/action/datastore_search?resource_id=${resourceId}`;

    try {
      while (url) {
        console.log("Fetching ", url);
        let response = null;
        try {
          response = await axios.get(url);
        } catch (e) {
          console.error(`Axios error: `, e);
          fs.appendFileSync(
            path.join(outputDir, "errors.log"),
            `Error in axios get ${JSON.stringify(e)}\n`
          );
          break;
        }

        const data = response.data;
        if (data && data.success) {
          records = records.concat(data.result.records);

          // Check if there's a next URL
          console.log(data.result._links);
          console.log(`offset:`, data.result.offset);
          console.log(`total:`, data.result.total);
          if (
            data.result._links &&
            data.result._links.next &&
            ((data.result.total > 100 && !data.result.offset) || // default is return 100
              data.result.offset < data.result.total)
          ) {
            url = domain + data.result._links.next; // Construct the next URL
          } else {
            break;
            url = null; // No more data to fetch
          }
        } else {
          throw new Error("API response was unsuccessful.");
        }
      }
    } catch (error) {
      console.error("Error fetching paginated data from API:", error);
      throw error; // Propagate the error up to be handled in the calling function
    }

    return records; // Return the combined records from all pages
  }

  // Function to process records should be modified to properly handle the `fileUrl` and errors.

  function processRecords(records, category) {
    const processedData = [];

    const prefixes = [
      "Advertisements",
      "Appointments",
      "Audited Reports",
      "Cessation of Service",
      "Corrigendum",
      "Death",
      "Dismissals",
      "Leave",
      "Notices under the Bankruptcy Act",
      "Notices under the Companies Act",
      "Notices under the Constitution",
      "Notices under various other Acts",
      "Others",
      "Revocation",
      "Tenders",
      "Termination of Service",
      "Vacation of Service",
    ];

    // Some discrepancies in the categories/sub-categories phrasing
    // This fixes by consolidating the records
    const mappingsToReplace = {
      "Notices under the Bankruptcy Act": "Bankruptcy Act Notices", // subCat
      "Notices under the Companies Act": "Companies Act Notices", // subCat
      "Notices under various other Acts": "Notices under other Acts", // subCat
      "Supplement  to Government Gazette": "Government Gazette Supplement", // cat
    };

    // Function to determine if category matches any of the prefixes
    function isPrefixCategory(cat) {
      return prefixes.some((prefix) => cat.startsWith(prefix));
    }

    for (const record of records) {
      let notificationNum = record.Notification_No;
      let publishDate = record.Published_Date;
      let gazetteCategory = category.replace("2023", "").trim();
      let subCategory = null;

      const match = record.Subject.match(/href="([^"]+)">(.+?)<\/a>/);
      if (!match) {
        fs.appendFileSync(
          path.join(outputDir, "errors.log"),
          `Error in Subject format for ID ${record._id}: ${record.Subject}\n`
        );
        continue;
      }
      const fileUrl = match[1];
      const gazetteTitle = match[2];

      // Check if the category is one of the specified prefixes
      if (isPrefixCategory(gazetteCategory)) {
        subCategory = gazetteCategory;
        gazetteCategory = "Government Gazette";
      }

      const rawEntry = {
        notificationNum,
        fileUrl,
        title: gazetteTitle,
        category: gazetteCategory,
        subCategory,
        publishDate,
        publishTimestamp: toTimestamp(publishDate),
      };

      // fix discrepancies in categories and subcategories
      if (rawEntry.category in mappingsToReplace) {
        rawEntry.category = mappingsToReplace[rawEntry.category];
      }

      if (rawEntry.subCategory in mappingsToReplace) {
        rawEntry.subCategory = mappingsToReplace[rawEntry.subCategory];
      }

      const logEntry = { objectID: hashRecord(rawEntry), ...rawEntry };
      processedData.push(logEntry);
    }

    return processedData;
  }

  // Function to write processed data to a JSON file
  function writeToJsonFile(filename, data) {
    fs.writeFileSync(
      path.join(outputDir, `${filename}.json`),
      JSON.stringify(data, null, 2),
      "utf8"
    );
  }

  // Read and process the CSV file
  async function processCsvRows(csvFilePath, domain) {
    return new Promise((resolve, reject) => {
      const rows = [];

      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on("data", (row) => rows.push(row))
        .on("end", async () => {
          try {
            for (const row of rows) {
              const apiData = await fetchDataFromAPI(domain, row.id);
              const processedData = processRecords(apiData, row.name);
              writeToJsonFile(row.name, processedData);

              const jsonData = JSON.parse(
                fs.readFileSync(
                  path.join(outputDir, `${row.name}.json`),
                  "utf8"
                )
              );
              await addToAlgolia(jsonData);
            }
            console.log("CSV file processing complete.");
            resolve("Processing complete"); // Resolve with a meaningful message
          } catch (error) {
            console.error("Error in processing CSV rows:", error);
            reject(error); // Reject the promise on error
          }
        });
    });
  }

  const domain = "https://data.gov.sg"; // Replace with your actual domain
  try {
    const result = await processCsvRows(csvFilePath, domain);
    return result; // or any other meaningful response
  } catch (error) {
    console.error(error);
    return { error: error.message }; // Returning an error response
  }
};

const axios = require("axios");
const fs = require("node:fs");
const Bluebird = require("bluebird");

const NETLIFY_ACCESS_TOKEN = "YOUR TOKEN HERE";

async function getAllNetlifySites() {
  let sites = [];
  let pageCount = 0;
  let hasNextPage = true;

  // 1. Obtain a list of Netlify site IDs for sites that belong to the isomer team
  while (hasNextPage) {
    try {
      // Get list of all repos within current page
      const resp = await axios.get(
        `https://api.netlify.com/api/v1/sites?access_token=${NETLIFY_ACCESS_TOKEN}&filter=all&page=${pageCount}`
      );
      hasNextPage = resp.headers.link.includes("next");
      resp.data.forEach((site) => {
        // If site belongs to the isomer account, push it to the list of sites to rebuild
        if (site.account_name === "isomer") {
          sites.push({ siteId: site.site_id, siteName: site.name });
        }
      });

      console.log(`Obtained ${resp.data.length} sites in page ${pageCount}`);
      pageCount++;
    } catch (err) {
      console.error(
        `An error occurred obtaining the list of Netlify site IDs: ${JSON.stringify(
          err.response.data
        )}`
      );
      throw err;
    }
  }

  console.log(
    `Found ${sites.length} Netlify sites belonging to the Isomer account`
  );

  return sites;
}

const readFromFile = () => {
  const sitesToDelete = fs.readFileSync("./sites.txt", "utf8");
  return sitesToDelete.split("\n");
};

const deleteSite = async (siteId) => {
  await axios.delete(
    `https://api.netlify.com/api/v1/sites/${siteId}?access_token=${NETLIFY_ACCESS_TOKEN}`
  );
};

const deleteSites = async () => {
  // NOTE: has shape `siteId: string, siteName: string`
  const allNetlifySites = await getAllNetlifySites();
  const sitesToDelete = readFromFile();
  const siteIdsToDelete = allNetlifySites.filter((site) =>
    sitesToDelete.includes(site.siteName)
  );

  await Promise.all(
    siteIdsToDelete.map(({ siteId, siteName }) =>
      deleteSite(siteId).then(() =>
        console.log(`Deleted ${siteName} with id ${siteId}`)
      )
    )
  );
};

deleteSites();

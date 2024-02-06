const fs = require("fs");
require("dotenv").config();

const apiKey = process.env.KEYCDN_API_KEY;
const apiUrl = "https://api.keycdn.com";

const getKeyCdnDomains = async () => {
  const response = await fetch(`${apiUrl}/zonealiases.json`, {
    headers: {
      Authorization: `Basic ${btoa(apiKey + ":")}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to retrieve zones: ${response.statusText}`);
  }

  const data = await response.json();

  // Extract the domain names from the zone data

  const domains = data.data.zonealiases
    .map((zone) => zone.name)
    .map((zone) => {
      if (zone.startsWith("www.")) {
        return zone.substring(4);
      } else {
        return zone;
      }
    });

  return domains;
};

function main() {
  getKeyCdnDomains()
    .then((domains) => {
      // read the file and get the domains into a list
      const dbDomains = fs
        .readFileSync("db-launches-table.csv", "utf8")
        .split("\n");
      domains = domains.filter((domain) => {
        // There exists some domains that used to be in KeyCDN, but have been migrated out already.
        return !dbDomains.includes(domain);
      });
      const allDomains = [...dbDomains, ...domains];
      console.log(allDomains);
      // add this to a csv file
      fs.writeFileSync("Updated_List_of_Domains.csv", allDomains.join("\n"));
    })
    .catch((error) => {
      console.error(error);
    });
}
main();

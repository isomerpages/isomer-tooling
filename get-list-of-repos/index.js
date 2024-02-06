const { Octokit } = require("@octokit/rest");
const axios = require("axios");
const dig = require("node-dig-dns");
const fs = require("fs");
const { AmplifyClient, ListAppsCommand } = require("@aws-sdk/client-amplify");

const { GITHUB_TOKEN, KEYCDN_API_KEY, NETLIFY_ACCESS_TOKEN } = process.env;

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

const amplifyClient = new AmplifyClient({
  region: "ap-southeast-1",
});

const specialExclusions = [
  "generate-site",
  "travisci-scripts",
  "recommender-train",
  "editor",
  "ci-test",
  "infra-deprecated",
  "markdown-helper",
];

// Retrieves the list of all Isomer repos from the isomerpages GitHub organisation
// except for some of the special repos that are not Isomer sites
async function getAllIsomerRepos() {
  console.log("Getting list of GitHub repos...");
  const repos = await octokit.paginate(octokit.repos.listForOrg, {
    org: "isomerpages",
    per_page: 100,
  });

  console.log(`Obtained ${repos.length} GitHub repos`);

  return repos
    .map((repo) => repo.name)
    .filter(
      (repo) =>
        !repo.startsWith("isomer-") &&
        !repo.startsWith("isomercms-") &&
        !specialExclusions.includes(repo)
    )
    .sort((a, b) => a.localeCompare(b));
}

// Uses the Netlify API to retrieve all sites that are currently on Netlify
async function getSitesOnNetlify() {
  console.log("Getting list of Netlify sites...");
  let sitesList = [];
  let pageCount = 1;
  let hasNextPage = true;

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
          sitesList.push({
            siteId: site.site_id,
            siteName: site.name,
            repoUrl: site.build_settings.repo_url,
          });
        }
      });

      console.log(
        `Obtained ${resp.data.length} Netlify sites in page ${pageCount}`
      );
      pageCount++;
    } catch (err) {
      console.error(
        `An error occurred obtaining the list of Netlify sites: ${JSON.stringify(
          err
        )}`
      );
      fs.appendFileSync(
        "get-list-of-repos-error.log",
        `Error getting list of Netlify sites: ${JSON.stringify(err)}\n`
      );
    }
  }

  console.log(`Obtained all ${sitesList.length} Netlify sites`);
  return sitesList.sort((a, b) => a.siteName.localeCompare(b.siteName));
}

// Uses the KeyCDN API to retrieve all zones that are currently on KeyCDN
async function getKeyCDNZones() {
  console.log("Getting list of KeyCDN zones...");
  const zones = [];

  try {
    const response = await axios.get("https://api.keycdn.com/zones.json", {
      headers: {
        Authorization: `Basic ${Buffer.from(`${KEYCDN_API_KEY}:`).toString(
          "base64"
        )}`,
      },
    });

    if (response.status !== 200) {
      throw new Error(
        `Failed to retrieve zones: ${response.status} ${response.statusText}`
      );
    }

    const data = response.data;

    zones.push(
      ...data.data.zones.map((zone) => ({
        zoneId: zone.id,
        zoneName: zone.name,
        originUrl: zone.originurl,
      }))
    );
  } catch (err) {
    console.error(
      `An error occurred obtaining the list of KeyCDN zones: ${JSON.stringify(
        err
      )}`
    );
    fs.appendFileSync(
      "get-list-of-repos-error.log",
      `Error getting list of KeyCDN zones: ${JSON.stringify(err)}\n`
    );
  }

  console.log(`Obtained ${zones.length} KeyCDN zones`);
  return zones;
}

// Uses the KeyCDN API to retrieve all domains that are currently on KeyCDN
// These are the zone aliases that are configured to point to the zones
async function getKeyCDNDomains() {
  console.log("Getting list of KeyCDN domains...");
  const domains = [];

  try {
    const response = await axios.get(
      "https://api.keycdn.com/zonealiases.json",
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${KEYCDN_API_KEY}:`).toString(
            "base64"
          )}`,
        },
      }
    );

    if (response.status !== 200) {
      throw new Error(
        `Failed to retrieve domains: ${response.status} ${response.statusText}`
      );
    }

    const data = response.data;

    domains.push(
      ...data.data.zonealiases.map((alias) => ({
        zoneId: alias.zone_id,
        domainName: alias.name,
      }))
    );
  } catch (err) {
    console.error(
      `An error occurred obtaining the list of KeyCDN domains: ${JSON.stringify(
        err
      )}`
    );
    fs.appendFileSync(
      "get-list-of-repos-error.log",
      `Error getting list of KeyCDN domains: ${JSON.stringify(err)}\n`
    );
  }

  console.log(`Obtained ${domains.length} KeyCDN domains`);
  return domains;
}

// Identifies the KeyCDN zones that are currently active for the Netlify sites
// by checking if the domain name is currently pointing to a KeyCDN CNAME
async function getSitesOnKeyCDN() {
  const zones = await getKeyCDNZones();
  const domains = await getKeyCDNDomains();

  return await Promise.all(
    zones.map(async (zone) => {
      const domainName = domains.find(
        (domain) => domain.zoneId === zone.zoneId
      )?.domainName;
      let isKeyCDNActive = false;

      if (!!domainName) {
        let digResult = await dig([domainName, "CNAME"]);

        if (
          Object.keys(digResult).includes("answer") &&
          digResult.answer.length > 0 &&
          digResult.answer.some((record) =>
            record.value.endsWith(".kxcdn.com.")
          )
        ) {
          isKeyCDNActive = true;
        }
      }

      return {
        zoneId: zone.zoneId,
        zoneName: zone.zoneName,
        originUrl: zone.originUrl,
        domainName:
          domains.find((domain) => domain.zoneId === zone.zoneId)?.domainName ||
          "",
        isKeyCDNActive,
      };
    })
  );
}

// Retrieves all AWS Ampllify sites
async function getSitesOnAmplify() {
  console.log("Getting list of Amplify sites...");
  let nextToken = undefined;
  const apps = [];

  try {
    do {
      const listAppsCommand = new ListAppsCommand({
        nextToken,
        maxResults: 100,
      });
      const listAppsResponse = await amplifyClient.send(listAppsCommand);
      nextToken = listAppsResponse.nextToken;
      const outputApps = listAppsResponse.apps;

      if (outputApps) {
        apps.push(...outputApps);
      }

      console.log(`Obtained ${apps.length} Amplify sites`);
    } while (nextToken);
  } catch (err) {
    console.error(
      `An error occurred obtaining the list of Amplify sites: ${JSON.stringify(
        err
      )}`
    );
    fs.appendFileSync(
      "get-list-of-repos-error.log",
      `Error getting list of Amplify sites: ${JSON.stringify(err)}\n`
    );
  }

  return apps
    .filter((app) => !app.name.endsWith("-staging-lite"))
    .map((app) => ({
      siteId: app.appId,
      siteName: app.name,
      repoUrl: app.repository,
    }))
    .sort((a, b) => a.siteName.localeCompare(b.siteName));
}

async function main() {
  try {
    const repos = await getAllIsomerRepos();
    const netlifySites = await getSitesOnNetlify();
    const keyCDNSites = await getSitesOnKeyCDN();
    const amplifySites = await getSitesOnAmplify();

    const result = repos.map((repo) => ({
      repoName: repo,
      netlifyStagingId:
        netlifySites.find(
          (site) =>
            site.repoUrl === `https://github.com/isomerpages/${repo}` &&
            site.siteName.endsWith("-staging")
        )?.siteId || "",
      netlifyStagingName:
        netlifySites.find(
          (site) =>
            site.repoUrl === `https://github.com/isomerpages/${repo}` &&
            site.siteName.endsWith("-staging")
        )?.siteName || "",
      netlifyProdId:
        netlifySites.find(
          (site) =>
            site.repoUrl === `https://github.com/isomerpages/${repo}` &&
            site.siteName.endsWith("-prod")
        )?.siteId || "",
      netlifyProdName:
        netlifySites.find(
          (site) =>
            site.repoUrl === `https://github.com/isomerpages/${repo}` &&
            site.siteName.endsWith("-prod")
        )?.siteName || "",
      keyCDNZoneId:
        keyCDNSites.find(
          (site) =>
            site.originUrl ===
            `https://${
              netlifySites.find(
                (site) =>
                  site.repoUrl === `https://github.com/isomerpages/${repo}` &&
                  site.siteName.endsWith("-prod")
              )?.siteName || ""
            }.netlify.app`
        )?.zoneId || "",
      keyCDNZoneName:
        keyCDNSites.find(
          (site) =>
            site.originUrl ===
            `https://${
              netlifySites.find(
                (site) =>
                  site.repoUrl === `https://github.com/isomerpages/${repo}` &&
                  site.siteName.endsWith("-prod")
              )?.siteName || ""
            }.netlify.app`
        )?.zoneName || "",
      keyCDNZoneIsActive:
        keyCDNSites.find(
          (site) =>
            site.originUrl ===
            `https://${
              netlifySites.find(
                (site) =>
                  site.repoUrl === `https://github.com/isomerpages/${repo}` &&
                  site.siteName.endsWith("-prod")
              )?.siteName || ""
            }.netlify.app`
        )?.isKeyCDNActive || false,
      amplifyAppId:
        amplifySites.find(
          (site) => site.repoUrl === `https://github.com/isomerpages/${repo}`
        )?.siteId || "",
      amplifyAppName:
        amplifySites.find(
          (site) => site.repoUrl === `https://github.com/isomerpages/${repo}`
        )?.siteName || "",
    }));

    const netlifyExceptions = netlifySites.filter(
      (site) =>
        !result.map((r) => r.netlifyStagingId).includes(site.siteId) &&
        !result.map((r) => r.netlifyProdId).includes(site.siteId)
    );
    const amplifyExceptions = amplifySites.filter(
      (site) => !result.map((r) => r.amplifyAppId).includes(site.siteId)
    );

    const csvOutput =
      "repo,netlifyStagingId,netlifyStagingName,netlifyProdId,netlifyProdName,keyCDNZoneId,keyCDNZoneName,keyCDNZoneIsActive,amplifyAppId,amplifyAppName\n" +
      result
        .map(
          (r) =>
            `${r.repoName},${r.netlifyStagingId},${r.netlifyStagingName},${r.netlifyProdId},${r.netlifyProdName},${r.keyCDNZoneId},${r.keyCDNZoneName},${r.keyCDNZoneIsActive},${r.amplifyAppId},${r.amplifyAppName}`
        )
        .join("\n");

    fs.writeFileSync("list-of-repos.csv", csvOutput);
    fs.writeFileSync(
      "netlify-exceptions.log",
      netlifyExceptions.map((site) => site.siteName).join("\n")
    );
    fs.writeFileSync(
      "amplify-exceptions.log",
      amplifyExceptions.map((site) => site.siteName).join("\n")
    );
  } catch (err) {
    console.error(err);
    fs.appendFileSync(
      "get-list-of-repos-error.log",
      `Error getting list of repos: ${JSON.stringify(err)}\n`
    );
  }
}

main();

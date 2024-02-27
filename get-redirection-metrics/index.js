const dig = require("node-dig-dns");
const { Octokit } = require("@octokit/rest");
const fs = require("fs");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function main() {
  try {
    const content = await octokit.repos.getContent({
      owner: "opengovsg",
      repo: "isomer-redirection",
      path: "src/certbot-websites.csv",
    });

    // Get list of domains in the file
    const domains = Buffer.from(content.data.content, "base64")
      .toString()
      .split("\n")
      .map((line) => line.split(",")[0])
      .slice(1)
      .filter((domain) => domain !== "");

    const newRedirectionIps = ["18.139.47.66", "18.138.108.8", "18.136.36.203"];
    const domainsOnNewRedirection = [];
    const domainsOnOldRedirection = [];
    const domainsWithExtraARecords = [];
    const domainsWithExtraAAAARecords = [];
    process.stdout.write(`Checking domain 0/${domains.length}...`);

    for (let i = 0; i < domains.length; i++) {
      // Reuse the same line in the terminal to show the progress
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(`Checking domain ${i + 1}/${domains.length}...`);

      const domain = domains[i];
      const result = await dig([domain, "A"]);
      const quadResult = await dig([domain, "AAAA"]);
      if (
        !Object.keys(result).includes("answer") ||
        result.answer.length === 0
      ) {
        // Likely decommissioned domain, will be noted in all-other-domains.log
        continue;
      }

      const values = result.answer
        .filter((record) => record.type === "A")
        .map((record) => record.value);

      if (
        values.includes(newRedirectionIps[0]) &&
        values.includes(newRedirectionIps[1]) &&
        values.includes(newRedirectionIps[2])
      ) {
        domainsOnNewRedirection.push(domain);
      }

      if (
        !values.includes(newRedirectionIps[0]) &&
        !values.includes(newRedirectionIps[1]) &&
        values.includes(newRedirectionIps[2])
      ) {
        domainsOnOldRedirection.push(domain);
      }

      if (
        values.some((value) => !newRedirectionIps.includes(value)) &&
        (domainsOnNewRedirection.includes(domain) ||
          domainsOnOldRedirection.includes(domain))
      ) {
        domainsWithExtraARecords.push(domain);
      }

      if (
        Object.keys(quadResult).includes("answer") &&
        quadResult.answer.filter((record) => record.type === "AAAA").length >
          0 &&
        (domainsOnNewRedirection.includes(domain) ||
          domainsOnOldRedirection.includes(domain))
      ) {
        domainsWithExtraAAAARecords.push(domain);
      }
    }

    const allOtherDomains = domains.filter(
      (domain) =>
        !domainsOnNewRedirection.includes(domain) &&
        !domainsOnOldRedirection.includes(domain) &&
        !domainsWithExtraARecords.includes(domain) &&
        !domainsWithExtraAAAARecords.includes(domain)
    );

    fs.writeFileSync(
      "domains-on-new-redirection.log",
      domainsOnNewRedirection.join("\n")
    );
    fs.writeFileSync(
      "domains-on-old-redirection.log",
      domainsOnOldRedirection.join("\n")
    );
    fs.writeFileSync(
      "domains-with-extra-a-records.log",
      domainsWithExtraARecords.join("\n")
    );
    fs.writeFileSync(
      "domains-with-extra-aaaa-records.log",
      domainsWithExtraAAAARecords.join("\n")
    );
    fs.writeFileSync("all-other-domains.log", allOtherDomains.join("\n"));

    console.log(
      `\rAll domains known to be on redirection service: ${domains.length}`
    );
    console.log(
      `Redirection domains correctly configured in the new way (i.e. 3 A records): ${domainsOnNewRedirection.length}`
    );
    console.log(
      `Redirection domains still configured in the old way (i.e. 1 A record): ${domainsOnOldRedirection.length}`
    );
    console.log(
      `Redirection domains with extra A records: ${domainsWithExtraARecords.length}`
    );
    console.log(
      `Redirection domains with extra AAAA records: ${domainsWithExtraAAAARecords.length}`
    );
    console.log(
      `Domains that are completely wrong or decommissioned: ${allOtherDomains.length}`
    );
    console.log(
      `Percentage of domains correctly configured in the new way over all valid redirection domains: ${
        Math.round(
          (domainsOnNewRedirection.length /
            (domainsOnNewRedirection.length + domainsOnOldRedirection.length)) *
            10000
        ) / 100
      }%`
    );
  } catch (err) {
    console.log(err);
    fs.appendFileSync(
      "get-redirection-metrics-error.log",
      `Error getting redirection service metrics: ${err}\n`
    );
    process.exit(1);
  }
}

main();

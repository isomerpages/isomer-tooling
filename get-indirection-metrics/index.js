const { Octokit } = require("@octokit/rest");
const fs = require("fs");
const dig = require("node-dig-dns");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const INDIRECTION_REPO = "isomerpages/isomer-indirection";

async function getAllIndirectionDomains() {
  const dnsTree = await octokit.git.getTree({
    owner: INDIRECTION_REPO.split("/")[0],
    repo: INDIRECTION_REPO.split("/")[1],
    tree_sha: "main",
    recursive: 1,
  });

  const dnsFiles = dnsTree.data.tree.filter((file) =>
    file.path.startsWith("dns/")
  );

  // Remove the ".ts" extension from the file name
  const domains = dnsFiles.map((file) => file.path.split("/")[1].slice(0, -3));

  return domains;
}

async function getDomainCNAMERecord(domain) {
  let result = await dig([domain, "CNAME"]);
  if (!Object.keys(result).includes("answer") || result.answer.length === 0) {
    result = await dig([`www.${domain}`, "CNAME"]);
  }

  return result;
}

async function getDomainsOnIndirectionLayer(domains) {
  const domainsOnIndirectionLayer = [];
  process.stdout.write(`Checking domain 0/${domains.length}...`);

  for (let i = 0; i < domains.length; i++) {
    const result = await getDomainCNAMERecord(domains[i]);
    // Reuse the same line in the terminal to show the progress
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(`Checking domain ${i + 1}/${domains.length}...`);

    if (
      Object.keys(result).includes("answer") &&
      result.answer.length > 0 &&
      result.answer.some((record) =>
        record.value.endsWith(".hostedon.isomer.gov.sg.")
      )
    ) {
      domainsOnIndirectionLayer.push(domains[i]);
    }
  }

  return domainsOnIndirectionLayer;
}

async function main() {
  try {
    const domains = await getAllIndirectionDomains();
    const domainsOnIndirectionLayer = await getDomainsOnIndirectionLayer(
      domains
    );
    const domainsNotOnIndirectionLayer = domains.filter(
      (domain) => !domainsOnIndirectionLayer.includes(domain)
    );

    fs.writeFileSync("github-indirection-domains.log", domains.join("\n"));
    fs.writeFileSync(
      "live-domains-on-indirection.log",
      domainsOnIndirectionLayer.join("\n")
    );
    fs.writeFileSync(
      "domains-not-on-indirection.log",
      domainsNotOnIndirectionLayer.join("\n")
    );

    console.log(
      `\rAll domains known to be on indirection layer: ${domains.length}`
    );
    console.log(
      `Domains correctly configured to be on indirection layer: ${domainsOnIndirectionLayer.length}`
    );
    console.log(
      `Domains not yet configured to be on indirection layer: ${domainsNotOnIndirectionLayer.length}`
    );
    console.log(
      `Percentage: ${
        Math.round(
          (domainsOnIndirectionLayer.length / domains.length) * 10000
        ) / 100
      }%`
    );

    process.exit(0);
  } catch (err) {
    console.log(err);
    fs.appendFileSync(
      "get-indirection-metrics-error.log",
      `Error getting DNS indirection layer metrics: ${err}\n`
    );
    process.exit(1);
  }
}

main();

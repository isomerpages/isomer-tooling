const { Octokit } = require("@octokit/rest");
const fs = require("fs");

const { GITHUB_TOKEN, } = process.env;

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
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
async function getAllRepoSizes() {
  console.log("Getting list of GitHub repos...");
  const repos = await octokit.paginate(octokit.repos.listForOrg, {
    org: "isomerpages",
    per_page: 100,
  });

  console.log(`Obtained ${repos.length} GitHub repos`);

  return repos
    .map((repo) => ({
      name: repo.name,
      size: repo.size
    }))
    .filter(
      (repo) =>
        !repo.name.startsWith("isomer-") &&
        !repo.name.startsWith("isomercms-") &&
        !specialExclusions.includes(repo.name)
    )
    .sort((a, b) => b.size - a.size);
}

async function main() {
  try {
    const repos = await getAllRepoSizes();

    fs.writeFileSync("repos.txt", JSON.stringify(repos, null, 2));
  } catch (err) {
    console.error(err);
    fs.appendFileSync(
      "get-github-repo-sizes-error.log",
      `Error getting list of repos: ${JSON.stringify(err)}\n`
    );
  }
}

main();

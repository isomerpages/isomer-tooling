/* 
This script is meant for a one time use to update the state of repos to disallow squash and merge.
To use, add .env with GITHUB_TOKEN
*/

const ISOMER_ADMIN_REPOS = [
  "isomercms-backend",
  "isomercms-frontend",
  "isomer-redirection",
  "isomerpages-template",
  "isomer-conversion-scripts",
  "isomer-wysiwyg",
  "isomer-slackbot",
  "isomer-tooling",
  "generate-site",
  "travisci-scripts",
  "recommender-train",
  "editor",
  "ci-test",
  "infra",
  "markdown-helper",
]

const { Octokit } = require("@octokit/rest");
const fs = require("fs");
const csv = require("fast-csv");
require("dotenv").config();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function getRepos(orgName) {
  try {
    const repos = await octokit.paginate(octokit.repos.listForOrg, {
      org: orgName,
      per_page: 100,
    });
    return repos;
  } catch (err) {
    console.log(err);
    fs.appendFileSync("repo-error.log", `Error fetching repos: ${err}\n`);
    return [];
  }
}

async function updateMergeRules(orgName) {
  const repos = await getRepos(orgName);
  for (let repo of repos) {
    if (!ISOMER_ADMIN_REPOS.includes(repo.name)) await octokit.repos.update({
      owner: orgName,
      repo: repo.name,
      allow_squash_merge: false
    })
  }
}

updateMergeRules("isomerpages");

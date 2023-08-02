/* 
This script can be used to find the list of repos we have in our Github org 
and the corresponding users of each repo.
Since the output can be big and have errors, it also writes the results and errors to CSV files.
To use, add .env with GITHUB_TOKEN
*/

const { Octokit } = require("@octokit/rest");
const fs = require("fs");
const csv = require("fast-csv");
require("dotenv").config();

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
];

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

async function getCollaborators(orgName, repo) {
  try {
    const collaborators = await octokit.paginate(
      octokit.repos.listCollaborators,
      {
        owner: orgName,
        repo: repo,
        per_page: 100,
      }
    );
    return collaborators;
  } catch (err) {
    console.log(err);
    fs.appendFileSync(
      "collaborator-error.log",
      `Error fetching collaborators for repo ${repo}: ${err}\n`
    );
    return [];
  }
}

async function getUsers(orgName) {
  const repoStream = fs.createWriteStream("repos.csv");
  const repoCsvStream = csv.format({ headers: ["Repo"] });
  repoCsvStream.pipe(repoStream);

  const userStream = fs.createWriteStream("users.csv");
  const userCsvStream = csv.format({ headers: ["Repo", "UserID"] });
  userCsvStream.pipe(userStream);

  const repos = await getRepos(orgName);
  for (let repo of repos) {
    if (ISOMER_ADMIN_REPOS.includes(repo.name)) continue;
    repoCsvStream.write({ Repo: repo.name });

    const collaborators = await getCollaborators(orgName, repo.name);
    for (let collaborator of collaborators) {
      userCsvStream.write({ Repo: repo.name, UserID: collaborator.login });
    }
  }

  repoCsvStream.end();
  userCsvStream.end();
}

const orgName = "isomerpages";
getUsers(orgName);

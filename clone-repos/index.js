#!/usr/bin/env node


/* 
This script is meant for a one time use to clone all repos into our mounted EFS.
To use, we need to ssh into our ec2 instance, and run this scipt. Before running,
add .env with GITHUB_TOKEN, EFS_VOL_PATH, SSH_KNOWN_HOSTS_PATH, and SSH_PRIVATE_KEY_PATH
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
const simpleGit = require("simple-git");
const GIT_SSH_COMMAND = `ssh -o UserKnownHostsFile=${process.env.SSH_KNOWN_HOSTS_PATH} -o StrictHostKeyChecking=no -i ${process.env.SSH_PRIVATE_KEY_PATH}`;
const git = simpleGit().env('GIT_SSH_COMMAND', GIT_SSH_COMMAND)

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
    return [];
  }
}

const cloneRepository = async (repositoryUrl, destinationPath) => {
  try {
    await git.clone(repositoryUrl, destinationPath);
  } catch (err) {
    console.log(err)
    fs.appendFileSync(
      "clone-repo.log",
      `Error cloning repo ${repo}: ${err}\n`
    );
  }
};

async function cloneRepos(orgName) {
  const repos = await getRepos(orgName);
  for (let repo of repos) {
    if (!ISOMER_ADMIN_REPOS.includes(repo.name)) {
      // Make check for prior existence of repo
      const repoPath = `${process.env.EFS_VOL_PATH}/${repo.name}`
      if (fs.existsSync(repoPath)) continue
      const repoUrl = `git@github.com:${orgName}/${repo.name}.git`
      await cloneRepository(repoUrl, repoPath)
    }
  }
}

cloneRepos("isomerpages");

// Removes the logs, directories created
require("dotenv").config();
const fs = require("fs").promises;
const { Octokit } = require("@octokit/rest");
const path = require("path");

const DIRECTORY_PATH = "./testDirectories";
const REPO_PREFIX = "testRepo_";
const TOTAL_REPOS = 100;
const USER_NAME = "YOUR_GITHUB_USERNAME"; // This should be the owner of the repo

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function deleteRepoOnGithub(repoName) {
  return await octokit.repos.delete({
    owner: USER_NAME,
    repo: repoName,
  });
}

async function cleanup(cleanupGithub) {
  try {
    // Delete local repositories
    await fs.rmdir(DIRECTORY_PATH, { recursive: true });
    console.log(`Deleted local directories in ${DIRECTORY_PATH}`);

    // Delete logs
    try {
      await fs.unlink(path.join(__dirname, "info.log"));
      console.log("Deleted info.log");
    } catch (error) {
      // Only log the error if the file exists and couldn't be deleted
      if (error.code !== "ENOENT") {
        console.error(`Failed to delete info.log: ${error.message}`);
      }
    }

    try {
      await fs.unlink(path.join(__dirname, "errors.log"));
      console.log("Deleted errors.log");
    } catch (error) {
      // Only log the error if the file exists and couldn't be deleted
      if (error.code !== "ENOENT") {
        console.error(`Failed to delete errors.log: ${error.message}`);
      }
    }

    if (cleanupGithub) {
      for (let i = 0; i < TOTAL_REPOS; i++) {
        try {
          await deleteRepoOnGithub(`${REPO_PREFIX}${i}`);
          console.log(`Deleted GitHub repo ${REPO_PREFIX}${i}`);
        } catch (error) {
          console.error(
            `Failed to delete GitHub repo ${REPO_PREFIX}${i}: ${error.message}`
          );
        }
      }
    }
  } catch (error) {
    console.error(`Cleanup failed: ${error.message}`);
  }
}

// Execute the cleanup function
cleanup(false); // Set to true if you want to delete GitHub repos, false otherwise.

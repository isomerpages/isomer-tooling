// This initialises a simple git client for each operation performed
require("dotenv").config();
const { exec } = require("child_process");
const fs = require("fs").promises;
const { Octokit } = require("@octokit/rest");
const simpleGit = require("simple-git");

const DIRECTORY_PATH = "./testDirectories";
const REPO_PREFIX = "testRepo_";
const TOTAL_REPOS = 200;
const MAX_CONCURRENT_PROCESSES = 200; // Adjust this as needed
const RANDOM_OPS = 10;
let successCount = 0;
let failedCount = 0;

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function createRepoOngithub(repoName) {
  return await octokit.repos.createForAuthenticatedUser({
    name: repoName,
    private: true,
  });
}

async function logError(error) {
  await fs.appendFile(
    "errors.log",
    `${error} at ${new Date().toISOString()}\n`
  );
}

async function logInfo(info) {
  await fs.appendFile("info.log", `${info} at ${new Date().toISOString()}\n`);
}

async function logMem(info) {
  await fs.appendFile("mem.log", `${info} at ${new Date().toISOString()}\n`);
}

function monitorMemoryUsage(interval = 1000) {
  return setInterval(async () => {
    const memoryUsage = process.memoryUsage();
    const rss = (memoryUsage.rss / 1024 / 1024).toFixed(2); // Resident Set Size
    const heapTotal = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2); // Total size of the allocated heap
    const heapUsed = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2); // Actual memory used during execution
    // Get the number of git processes
    exec(
      "ps aux | grep git | grep -v grep | wc -l",
      async (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }
        const gitProcesses = stdout.trim(); // Remove any newline or spaces
        await logMem(
          `Memory Usage - RSS: ${rss} MB, Heap Total: ${heapTotal} MB, Heap Used: ${heapUsed} MB, Git Processes: ${gitProcesses}`
        );
      }
    );
  }, interval);
}

async function performRepoOperations(i, createOnGithub) {
  const repoDir = `${DIRECTORY_PATH}/${REPO_PREFIX}${i}`;
  let failedOps = 0;

  // Create directory and dummy file
  await fs.mkdir(repoDir);
  await logInfo(`Directory ${repoDir} created.`);

  const randomContent = `Random content ${Math.random()}`;
  await fs.writeFile(`${repoDir}/test.md`, randomContent);
  await logInfo(`test.md created in ${repoDir} with random content.`);

  // Initialize git after creating the directory
  const git = simpleGit(repoDir, {
    maxConcurrentProcesses: MAX_CONCURRENT_PROCESSES,
  });
  await git.init();
  await logInfo(`Git initialized in ${repoDir}.`);

  if (createOnGithub) {
    // Create repo on GitHub and connect local repo to GitHub
    const {
      data: { clone_url },
    } = await createRepoOngithub(`${REPO_PREFIX}${i}`);
    await git.addRemote("origin", clone_url);
    await logInfo(
      `GitHub repo ${REPO_PREFIX}${i} created and connected to local repo.`
    );
  }

  // Randomized git operations (only push to GitHub if createOnGithub is true)
  for (let j = 0; j < RANDOM_OPS; j++) {
    const newContent = `Random content ${Math.random()}`;
    await fs.writeFile(`${repoDir}/test.md`, newContent);

    try {
      await git.add(".");
      await git.commit(`Random commit ${Math.random()}`);
      logInfo(`Random commit created in ${repoDir}.`);
    } catch (e) {
      failedOps += 1;
    }

    if (createOnGithub) {
      await git.push("origin", "master");
      logInfo(`Changes pushed to GitHub for ${REPO_PREFIX}${i}.`);
    }
  }
  console.log(`Failed ops: ${failedOps} out of ${RANDOM_OPS} for ${repoDir}`);
}

function getExecutionTime(startTime) {
  const durationInMilliseconds = new Date() - startTime;
  const seconds = Math.floor((durationInMilliseconds / 1000) % 60);
  const minutes = Math.floor((durationInMilliseconds / (1000 * 60)) % 60);
  const hours = Math.floor((durationInMilliseconds / (1000 * 60 * 60)) % 24);

  return `${hours}h ${minutes}m ${seconds}s`;
}

async function main(createOnGithub) {
  const startTime = new Date();

  // Start monitoring memory usage every second
  const memoryInterval = monitorMemoryUsage();

  await fs.mkdir(DIRECTORY_PATH, { recursive: true });
  await logInfo(`Base directory ${DIRECTORY_PATH} created.`);

  const promises = [];

  for (let i = 0; i < TOTAL_REPOS; i++) {
    promises.push(
      (async () => {
        try {
          await performRepoOperations(i, createOnGithub);
          await logInfo(`All operations completed for ${REPO_PREFIX}${i}.`);
          successCount += 1;
        } catch (error) {
          await logError(`Error in repo ${REPO_PREFIX}${i}: ${error}`);
          failedcCount += 1;
        }
      })()
    );
  }

  await Promise.all(promises);

  // Stop the memory monitoring
  clearInterval(memoryInterval);

  console.log("success count: ", successCount);
  console.log("failed count: ", failedCount);
  const executionTime = getExecutionTime(startTime);
  console.log(`Total execution time: ${executionTime}`);
}

// Execute the main function
main(false); // Set to true if you want GitHub operations, false otherwise.

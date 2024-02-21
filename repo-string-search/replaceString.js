const fs = require('fs');
const { Octokit } = require('@octokit/rest');

const INPUT_FILE = "test.txt"
const TARGET_BRANCH = "netlify-repair"
// const SEARCH_REGEX = "https:\/\/.*\.netlify\.app\/"
// const REPLACEMENT_REGEX = "/"
const SEARCH_REGEX = "https:\/\/d33wubrfki0l68\.cloudfront\.net\/.*/images"
const REPLACEMENT_REGEX = "/images"
// const SEARCH_REGEX = "https:\/\/d33wubrfki0l68\.cloudfront\.net\/.*/files"
// const REPLACEMENT_REGEX = "/files"
const GITHUB_ORG = "isomerpages"

// Initialize Octokit with the token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function getOrCreateBranch(repository, branch) {
  try {
    const { data: branches } = await octokit.repos.listBranches({
      owner: GITHUB_ORG,
      repo: repository,
    });

    const branchExists = branches.some((b) => b.name === branch);

    if (!branchExists) {
      const stagingBranch = branches.filter((branch) => branch.name === "staging")[0]
      // Create the branch
      await octokit.git.createRef({
        owner: GITHUB_ORG,
        repo: repository,
        ref: `refs/heads/${branch}`,
        sha: stagingBranch.commit.sha,
      });

      console.log(`Created branch ${branch} in ${repository}`);
    }

    return branch;
  } catch (error) {
    console.error(`Error creating/getting branch in ${repository}: ${error.message}`);
    throw error;
  }
}

// Function to update files in a repository
async function updateFile(repository, branch, filePath, searchString, replacement) {
  try {
    await getOrCreateBranch(repository, branch)
    // Get current file content
    const { data: { content, sha } } = await octokit.repos.getContent({
      owner: GITHUB_ORG,
      repo: repository,
      path: filePath,
      ref: branch,
    });

    const decodedContent = Buffer.from(content, 'base64').toString('utf-8');
    console.log(decodedContent)

    const updatedContent = decodedContent.replaceAll(RegExp(searchString, "g"), replacement);

    console.log(updatedContent)
    // Update the file in the repository
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_ORG,
      repo: repository,
      path: filePath,
      message: 'Admin: fix links',
      content: Buffer.from(updatedContent).toString('base64'),
      sha: sha,
      branch: branch,
    });

    console.log(`Updated ${filePath} in ${repository}`);
  } catch (error) {
    console.error(`Error updating ${filePath} in ${repository}: ${error.message}`);
  }
}

async function updateAllFiles(sourceFile, targetBranch) {
  // Read the file containing repositories and pages
  const fileContents = fs.readFileSync(sourceFile, 'utf-8');
  const repoInfo = fileContents.split('\n')
  for (const repo of repoInfo) {
    const [repoName, filePath] = repo.split(",")
    await updateFile(repoName, targetBranch, filePath, SEARCH_REGEX, REPLACEMENT_REGEX)
  }
}

updateAllFiles(INPUT_FILE, TARGET_BRANCH)
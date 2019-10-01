const axios = require('axios')
const fs = require('fs')
const Bluebird = require('bluebird')
const _ = require('lodash')
const REPOS_TO_IGNORE = require('./repo-ignore.json')

// This token only has write access to the GitHub repo
const GITHUB_TOKEN_REPO_ACCESS = process.env.GITHUB_TOKEN_REPO_ACCESS 

// Files that we want to keep consistent across all Isomer repos
const ISOMER_STANDARD_FILES = [
  "Gemfile.lock",
  "Gemfile",
  ".gitignore",
  ".ruby-version"
]

// validateStatus allows axios to handle a 404 HTTP status without rejecting the promise.
// This is necessary because GitHub returns a 404 status when the file does not exist.
const validateStatus = (status) => {
  return (status >= 200 && status < 300) || status === 404
}

// Read each file in base64 encoding and generate a JSON object:
// ==============================
// {
//  "filename": "FILE_NAME",
//  "content": "CONTENT_IN_BASE64" 
// }
// ==============================
readFileContents = async (filenameArray) => {
  try {
    // Convert fs.readFile() to an async/await-able function
    const readFileAsync = Bluebird.promisify(fs.readFile)

    return Bluebird.map(filenameArray, async (filename) => {
      return {
        "filename": filename,
        "content": await readFileAsync(`./standard_files/${filename}`, 'base64')
      }
    })
  } catch (err) {
    console.log(err)
  }
}

updateRepos = async () => {
  try {
    let fileContentsObject = await readFileContents(ISOMER_STANDARD_FILES)

    // Get list of all repos
    let repos = (await axios.get('https://api.github.com/orgs/isomerpages/repos', {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN_REPO_ACCESS}`,
        "Content-Type": "application/json"
      }
    })).data

    let nestedPromises = repos.map(async(repo) => {
      let reponame = repo.name
      // Check if repo contains a staging branch - if it does, we want to update that repo
      if (await hasStaging(`https://api.github.com/repos/isomerpages/${reponame}/branches/staging`)) {

        // Check if repo is in ignore-list
        if (!REPOS_TO_IGNORE.includes(reponame)) {
          console.log(`Updating repo ${reponame}`)
          return Bluebird.map(fileContentsObject, async ({filename, content}) => {
            return updateFile(reponame, filename, content)
          })
        } else {
          console.log(`Ignoring repo ${reponame}`)
        }
      }
    })

    await Promise.all(nestedPromises)

  } catch (err) {
    console.log(err)
  }
}

hasStaging = async (stagingBranchEndpoint) => {
  // If the resp status is 200, the branch exists
  let resp = await axios.get(stagingBranchEndpoint, {
    validateStatus: validateStatus,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN_REPO_ACCESS}`,
      "Content-Type": "application/json"
    }
  })

  return resp.status === 200
}

// Creates/updates file `filename` with the base64 encoded content `content` onto the GitHub repo `reponame`.
updateFile = async(reponame, filename, newFileContent) => {
  try {
    let params = {
      "message": `Update ${filename} dependencies`,
      "content": newFileContent,
      "branch": "staging"
    }

    const FILE_PATH_IN_REPO = `https://api.github.com/repos/isomerpages/${reponame}/contents/${filename}?ref=staging`

    let { status, data } = await axios.get(FILE_PATH_IN_REPO, {
      validateStatus: validateStatus,
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN_REPO_ACCESS}`,
        "Content-Type": "application/json"
      }
    })

    // The file does not exist
    if (status === 404) {
      return axios.put(FILE_PATH_IN_REPO, params, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN_REPO_ACCESS}`,
          "Content-Type": "application/json"
        }
      })
    } else {
      // This is to get rid of extra newline characters.
      // GitHub returns the existing content with extra newline characters - this breaks the comparison
      // because fs.readFile() returns the content without newline characters
      let currentFileContent = data.content.replace(/\n/g, '')

      // The file exists but is outdated
      if (currentFileContent !== newFileContent) {
        params.sha = data.sha
        return axios.put(FILE_PATH_IN_REPO, params, {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN_REPO_ACCESS}`,
            "Content-Type": "application/json"
          }
        })
      }
    }
  } catch (err) {
    console.log(err)
  }
}

main = () => {
  updateRepos()
}

main()
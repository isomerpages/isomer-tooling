const axios = require('axios')
const fs = require('fs')
const Bluebird = require('bluebird')
const _ = require('lodash')
const REPOS_TO_IGNORE = require('./repo-ignore.json')
const ISOMER_ORG_NAME = "isomerpages"

// This token only has write access to the GitHub repo
const GITHUB_TOKEN_REPO_ACCESS = process.env.GITHUB_TOKEN_REPO_ACCESS 

// Sleep function
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// Files that we want to keep consistent across all Isomer repos
const ISOMER_STANDARD_FILES = [
  "Gemfile.lock",
  "Gemfile",
  ".gitignore",
  ".ruby-version"
]

// Files that we want to delete across all Isomer repos
const ISOMER_DELETED_FILES = [
  ".travis.yml",
  "travis-script.js"
]

// Returns true if site is an isomer site
const isIsomerSite = fullname => {
  return fullname.split('/')[0] === ISOMER_ORG_NAME
}

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

    // Loop through all user repos
    let repos = []
    let pageCount = 1
    let hasNextPage = true;
    const filePath = `https://api.github.com/user/repos?per_page=100&page=`;

    while (hasNextPage) {
      // Get list of all repos within current page
      const resp = await axios.get(filePath + pageCount, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN_REPO_ACCESS}`,
          "Content-Type": "application/json"
        }
      })

      resp.data.forEach(dataObject => {
        const fullname = dataObject.full_name
        if (isIsomerSite(fullname) && !dataObject.archived) {
          repos.push(dataObject)
        }
      })

      hasNextPage = resp.headers.link.includes('next')
      ++pageCount
    }

    let nestedPromises = repos.forEach(async(repo) => {
      // Prevent hitting API rate limit
      await sleep(1000)

      let reponame = repo.name
      // Check if repo contains a staging branch - if it does, we want to update that repo
      if (await hasStaging(`https://api.github.com/repos/isomerpages/${reponame}/branches/staging`)) {

        // Check if repo is in ignore-list
        if (!REPOS_TO_IGNORE.includes(reponame)) {
          console.log(`Updating repo ${reponame}`)

          let updateFilePromises = Bluebird.map(fileContentsObject, async ({filename, content}) => {
            console.log(`Updating file ${filename} in ${reponame}`)
            return updateFile(reponame, filename, content)
          })

          let deleteFilePromises = Bluebird.map(ISOMER_DELETED_FILES, async (filename) => {
            console.log(`Deleting file ${filename} in ${reponame}`)
            return deleteFile(reponame, filename)
          })


          return Promise.all(updateFilePromises, deleteFilePromises)
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

deleteFile = async(reponame, filename) => {
  try {
    const FILE_PATH_IN_REPO = `https://api.github.com/repos/isomerpages/${reponame}/contents/${filename}?ref=staging`

    let { status, data } = await axios.get(FILE_PATH_IN_REPO, {
      validateStatus: validateStatus,
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN_REPO_ACCESS}`,
        "Content-Type": "application/json"
      }
    })

    // File does not exist already, return immediately
    if (status === 404) return

    const sha = data.sha

    const params = {
      "message": `Delete ${filename}`,
      "sha": sha,
      "branch": "staging"
    }

    await axios.delete(FILE_PATH_IN_REPO, {
      params,
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN_REPO_ACCESS}`,
        "Content-Type": "application/json"
      }
    })

  } catch (err) {
    console.log(err)
  }
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
      await axios.put(FILE_PATH_IN_REPO, params, {
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
        await axios.put(FILE_PATH_IN_REPO, params, {
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
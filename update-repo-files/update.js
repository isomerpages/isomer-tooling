const axios = require('axios')
const fs = require('fs')
const Bluebird = require('bluebird')
const yaml = require('js-yaml')
const ISOMER_ORG_NAME = "isomerpages"
const REMOTE_THEME_STRING_FOR_PREV_GEN_ISOMER_SITES = 'isomerpages/isomerpages-template'

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
  ".ruby-version",
  "netlify.toml"
]

// Files that we want to delete across all Isomer repos
const ISOMER_DELETED_FILES = []

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

    let nestedPromises = Bluebird.mapSeries(repos, async(repo) => {
      // Prevent hitting API rate limit
      await sleep(1000)

      let reponame = repo.name
      // Check if repo contains a staging branch - if it does, we want to update that repo
      if (await hasStaging(`https://api.github.com/repos/isomerpages/${reponame}/branches/staging`)) {

        // Check if repo is indeed a non-CMS repo by checking that `remote-theme` is `isomerpages-template`
        if (await isIsomerSiteUsingOldTemplate(reponame)) {
          console.log(`Updating repo ${reponame}`)

          let updateFilePromises = Bluebird.mapSeries(fileContentsObject, async ({filename, content}) => {
            try {
              return updateFile(reponame, filename, content)
            } catch (err) {
              console.log(err)
            }
          })

          let deleteFilePromises = Bluebird.mapSeries(ISOMER_DELETED_FILES, async (filename) => {
            try {
              return deleteFile(reponame, filename)
            } catch (err) {
              console.log(err)
            }
          })


          return Promise.all([updateFilePromises, deleteFilePromises])
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

isIsomerSiteUsingOldTemplate = async (reponame) => {
  const configFileEndpoint = `https://api.github.com/repos/isomerpages/${reponame}/contents/_config.yml?ref=staging`
  let resp = await axios.get(configFileEndpoint, {
    validateStatus: validateStatus,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN_REPO_ACCESS}`,
      "Content-Type": "application/json"
    }
  })

  if (resp.status === 200) {
    const content = resp.data.content
    const decodedContent = Buffer.from(content, 'base64')
    let yamlContent
    try {
      yamlContent = yaml.load(decodedContent)
      if (yamlContent.remote_theme === REMOTE_THEME_STRING_FOR_PREV_GEN_ISOMER_SITES) return true
    } catch (err) {
      console.log(`   error in ${reponame} yaml: ${err}`)
    }
  }
  
  return false
}

deleteFile = async(reponame, filename) => {
  try {
    console.log(`Checking for file ${filename} in ${reponame}`)
    const FILE_PATH_IN_REPO = `https://api.github.com/repos/isomerpages/${reponame}/contents/${filename}?ref=staging`

    let { status, data } = await axios.get(FILE_PATH_IN_REPO, {
      validateStatus: validateStatus,
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN_REPO_ACCESS}`,
        "Content-Type": "application/json"
      }
    })

    // File does not exist already, return immediately
    if (status === 404) {
      console.log(`   File ${filename} in ${reponame} does not exist`)
      return
    }

    const sha = data.sha

    const params = {
      "message": `Delete ${filename}`,
      "sha": sha,
      "branch": "staging"
    }

    console.log(`   Deleting file ${filename} in ${reponame}`)

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
    console.log(`Checking if file ${filename} in ${reponame} exists`)
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
      console.log(`   Creating file ${filename} in ${reponame}`)
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
        console.log(`   Replacing file ${filename} in ${reponame}`)
        params.sha = data.sha
        await axios.put(FILE_PATH_IN_REPO, params, {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN_REPO_ACCESS}`,
            "Content-Type": "application/json"
          }
        })
      } else {
        console.log(`   File ${filename} in ${reponame} exists... ignoring`)
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
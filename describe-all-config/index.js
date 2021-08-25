const NetlifyAPI = require('netlify')
const { Octokit } = require("@octokit/rest")
const yaml = require('js-yaml')
const bluebird = require('bluebird')
const _ = require('lodash')
const {Base64} = require('js-base64')
const createCsvWriter = require('csv-writer').createObjectCsvWriter

const NETLIFY_ACCESS_TOKEN = process.env.NETLIFY_ACCESS_TOKEN
const GITHUB_TOKEN_REPO_ACCESS = process.env.GITHUB_TOKEN_REPO_ACCESS
const netlifyClient = new NetlifyAPI(NETLIFY_ACCESS_TOKEN)

const REPO_OWNER = 'isomerpages'
const NETLIFY_ACCOUNT_NAME = 'isomer'
const OUTPUT_FILE_NAME = 'isomer-config-all.csv'

const octokit = new Octokit({ 
  auth: GITHUB_TOKEN_REPO_ACCESS
})

const csvWriter = createCsvWriter({
  path: OUTPUT_FILE_NAME,
  header: [
    { id: 'gitHubRepoName', title: 'GitHub Repo Name'},
    { id: 'gitHubRepoBranch', title: 'GitHub Repo Branch'},
    { id: 'remoteThemeConfig', title: 'Remote Theme'},
    { id: 'netlifySiteName', title: 'Netlify Site Name'},
    { id: 'netlifyBuildCommand', title: 'Netlify Build Command'},
    { id: 'missingBuildSettingsError', title: 'Missing Build Settings Error'},
    { id: 'missingRemoteThemeError', title: 'Missing Remote Theme Error'},
    { id: 'incorrectGitHubOrganizationError', title: 'Incorrect GitHub Org Error'},
  ]
})

// Sleep to prevent hitting rate limits
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const listNetlifySites = async function () {
  let sites = []
  let currPageSites = []
  let pageNum = 1

  while (true) {
    let newPageSites = await netlifyClient.listSitesForAccount({ 
      account_slug: NETLIFY_ACCOUNT_NAME,
      page: pageNum, 
      per_page: 100
    })
    sites = currPageSites.concat(newPageSites)
    currPageSites = sites
    console.log(pageNum, newPageSites.length)

    pageNum += 1
    if (newPageSites.length === 0) break
  }
  console.log(sites.length, 'netlify site count')
  return sites
}

const getRemoteThemeFromGitHub = async function (repoOwner, repoName, branch) {
  const CONFIG_FILE_PATH = '_config.yml'

  try {
    const configRawContent = await octokit.rest.repos.getContent({
      owner: repoOwner,
      repo: repoName,
      path: CONFIG_FILE_PATH,
      ref: branch
    })
    const configParsedContent = yaml.load(Base64.decode(configRawContent.data.content))
    return configParsedContent.remote_theme
  } catch (err) {
    return undefined
  }
}

const describeAllConfig = async function () {
  const netlifySites = await listNetlifySites()
  const allConfig = await bluebird.mapSeries(netlifySites, async (netlifySiteConfig, index) => {
    const netlifySiteName = netlifySiteConfig.name
    const netlifyBuildSettings = netlifySiteConfig.build_settings

    console.log(`Processing Netlify site ${netlifySiteName}, index ${index}`)
    await sleep(1000)

    // Define error variables
    let missingBuildSettingsError = false
    let missingRemoteThemeError = false
    let incorrectGitHubOrganizationError = false

    // Define data variables
    let gitHubRepoOwner
    let gitHubRepoName
    let netlifyBuildCommand
    let gitHubRepoBranch
    let remoteThemeConfig

    if (_.isEmpty(netlifyBuildSettings)) {
      // Site is not an isomer site because it is not meant to be built
      // TO-DO: Get rid of non-isomer site repos from the isomerpages GitHub organization
      missingBuildSettingsError = true
    } else {
      // repo_path is `isomerpages/repo-name`
      [gitHubRepoOwner, gitHubRepoName] = netlifyBuildSettings.repo_path.split('/')
      netlifyBuildCommand = netlifyBuildSettings.cmd
      gitHubRepoBranch = netlifyBuildSettings.repo_branch

      if (gitHubRepoOwner !== REPO_OWNER) {
        // Site is not an isomer site because it does not belong to the isomerpages GitHub organization
        // TO-DO: Get rid of non-isomer Netlify sites from the isomer Netlify account
        incorrectGitHubOrganizationError = true
      } else {
        try {
          remoteThemeConfig = await getRemoteThemeFromGitHub(gitHubRepoOwner, gitHubRepoName, gitHubRepoBranch)
        } catch (err) {
          // Site is not an isomer site because we could not find the remote_theme
          console.log(`Missing remote theme: ${gitHubRepoName}`)
        }
      }
    }

    return {
      gitHubRepoName,
      gitHubRepoBranch,
      remoteThemeConfig,
      netlifySiteName,
      netlifyBuildCommand,
      missingBuildSettingsError,
      incorrectGitHubOrganizationError
    }
  })

  await csvWriter.writeRecords(_.compact(allConfig))
}

describeAllConfig()
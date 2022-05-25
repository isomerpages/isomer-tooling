import fs from 'fs'

import { Octokit } from '@octokit/rest'
import git from 'isomorphic-git'
import http from 'isomorphic-git/http/node'
import config from '../config'

const githubAccessToken = config.get('githubAccessToken')
const octokit = new Octokit({ auth: githubAccessToken })

export const publishToGitHub = async (repoName: string): Promise<number> => {
  const [
    {
      data: { id: repoId },
    },
  ] = await Promise.all([
    octokit.repos.createInOrg({
      org: 'isomerpages',
      name: repoName,
      // description: `Staging: https://${repoName}-staging.netlify.app | Production: https://${repoName}-prod.netlify.app`,
      private: false,
    }),
    octokit.teams.create({
      org: 'isomerpages',
      name: repoName,
      privacy: 'closed',
    }),
  ])

  // Prepare git repo
  const dir = `/tmp/${repoName}`
  await git.init({ fs, dir, defaultBranch: 'staging' })
  await git.add({ fs, dir, filepath: '.' })
  await git.commit({
    fs,
    dir,
    message: 'Initial commit',
    author: {
      name: 'isomeradmin',
      email: 'isomeradmin@users.noreply.github.com',
    },
  })
  // Push contents, staging first then master,
  // so that staging is default branch
  const remote = 'origin'
  await git.addRemote({
    fs,
    dir,
    remote: 'origin',
    url: `https://github.com/isomerpages/${repoName}`,
  })
  await git.push({
    fs,
    http,
    dir,
    remote,
    remoteRef: 'staging',
    corsProxy: 'https://cors.isomorphic-git.org',
    onAuth: () => ({ username: 'user', password: githubAccessToken }),
  })
  await git.push({
    fs,
    http,
    dir,
    remote,
    remoteRef: 'master',
    corsProxy: 'https://cors.isomorphic-git.org',
    onAuth: () => ({ username: 'user', password: githubAccessToken }),
  })

  return repoId
}

// function sleep(ms: number) {
//   return new Promise((resolve) => {
//     setTimeout(resolve, ms)
//   })
// }

export const modifyUrls = async (repoName: string, domain: string) => {
  // Wait for Amplify to get ready
  //await sleep(10000)

  await octokit.repos.update({
    owner: 'isomerpages',
    repo: repoName,
    description: `Staging: https://staging.${domain} | Production: https://master.${domain}`,
  })

  const dir = `/tmp/${repoName}`
  const remote = 'origin'
  await git.add({ fs, dir, filepath: '.' })
  await git.commit({
    fs,
    dir,
    message: 'Set URLs',
    author: {
      name: 'isomeradmin',
      email: 'isomeradmin@users.noreply.github.com',
    },
  })

  await git.push({
    fs,
    http,
    dir,
    remote,
    remoteRef: 'staging',
    corsProxy: 'https://cors.isomorphic-git.org',
    onAuth: () => ({ username: 'user', password: githubAccessToken }),
  })
  await git.push({
    fs,
    http,
    dir,
    remote,
    remoteRef: 'master',
    corsProxy: 'https://cors.isomorphic-git.org',
    onAuth: () => ({ username: 'user', password: githubAccessToken }),
  })

  // Final touch-ups
  await Promise.all([
    octokit.repos.updateBranchProtection({
      owner: 'isomerpages',
      repo: repoName,
      branch: 'master',
      required_pull_request_reviews: {
        required_approving_review_count: 1,
      },
      enforce_admins: true,
      required_status_checks: null,
      restrictions: null,
      // Enable custom media type to enable required_pull_request_reviews
      headers: {
        accept: 'application/vnd.github.luke-cage-preview+json',
      },
    }),
    octokit.teams.addOrUpdateRepoPermissionsInOrg({
      org: 'isomerpages',
      team_slug: 'core',
      owner: 'isomerpages',
      repo: repoName,
      permission: 'admin',
    }),
    octokit.teams.addOrUpdateRepoPermissionsInOrg({
      org: 'isomerpages',
      team_slug: repoName,
      owner: 'isomerpages',
      repo: repoName,
      permission: 'push',
    }),
  ])
}

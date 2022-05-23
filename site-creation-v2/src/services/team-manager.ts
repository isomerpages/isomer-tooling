import { Octokit } from '@octokit/rest'

import config from '../config'

const githubAccessToken = config.get('githubAccessToken')
const octokit = new Octokit({ auth: githubAccessToken })

export type UserInstructions = {
  requesterEmail: string
  teamName: string
  users: {
    add: string[]
    remove: string[]
  }
}

export const manageTeam = async (
  userInstructions: UserInstructions
): Promise<string[]> => {
  const notFound = []
  const team = await octokit.teams.getByName({
    org: 'isomerpages',
    team_slug: userInstructions.teamName,
  })
  if (team) {
    for (const username of userInstructions.users.add) {
      try {
        await octokit.teams.addOrUpdateMembershipForUserInOrg({
          org: 'isomerpages',
          team_slug: userInstructions.teamName,
          username,
        })
      } catch (error) {
        if (error instanceof Error && error.message === 'Not Found') {
          notFound.push(username)
        } else {
          throw error
        }
      }
    }
    for (const username of userInstructions.users.remove) {
      try {
        await octokit.teams.removeMembershipForUserInOrg({
          org: 'isomerpages',
          team_slug: userInstructions.teamName,
          username,
        })
      } catch (error) {
        if (error instanceof Error && error.message === 'Not Found') {
          notFound.push(username)
        } else {
          throw error
        }
      }
    }
  }
  return notFound
}

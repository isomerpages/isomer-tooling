import { Request, Response } from 'express'
import { logger } from '../logger'

import { DecryptedContent, FormField } from '@opengovsg/formsg-sdk/dist/types'

import { manageTeam, UserInstructions } from '../services/team-manager'
import { mailOutcome } from '../services/outcome-mailer'

const makeUserInstructions = function ({
  responses,
}: {
  responses: FormField[]
}): UserInstructions {
  const userInstructions: UserInstructions = {
    requesterEmail: '',
    teamName: '',
    users: {
      add: [],
      remove: [],
    },
  }

  const requesterEmailResponse = responses.find(
    ({ question }) => question === 'Your Government E-mail'
  )
  if (requesterEmailResponse && requesterEmailResponse.answer) {
    userInstructions.requesterEmail = requesterEmailResponse.answer
  }

  const teamNameResponse = responses.find(
    ({ question }) => question === 'Team Name'
  )
  if (teamNameResponse && teamNameResponse.answer) {
    userInstructions.teamName = teamNameResponse.answer
  }

  const addUsersResponse = responses.find(
    ({ question }) => question === 'GitHub users to be added (Username)'
  )
  if (addUsersResponse && addUsersResponse.answerArray) {
    userInstructions.users.add = userInstructions.users.add
      .concat(...addUsersResponse.answerArray)
      .filter((s) => s !== '')
  }

  const removeUsersResponse = responses.find(
    ({ question }) => question === 'GitHub users to be removed (Username)'
  )
  if (removeUsersResponse && removeUsersResponse.answerArray) {
    userInstructions.users.remove = userInstructions.users.remove
      .concat(...removeUsersResponse.answerArray)
      .filter((s) => s !== '')
  }

  return userInstructions
}

type UserManagementResults = {
  add: string[]
  remove: string[]
  notFound: string[]
}

const onSuccess = (teamName: string, users: UserManagementResults) => () => `
User management for ${teamName} has been executed successfully! 

Users who are new to Isomer will be sent a GitHub invitation via e-mail.
They are to accept the invitation by following the instructions in the
mail, or visiting https://github.com/isomerpages and following the 
instructions there.

The following users have been added:
${users.add.join('\n')}

The following users have been removed:
${users.remove.join('\n')}

The following users were not found:
${users.notFound.join('\n')}
`

const action = 'managing users for'

export default async (req: Request, res: Response): Promise<void> => {
  const { submissionId } = req.body.data

  logger?.info(`[${submissionId}] Handling manage-users submission`)
  let statusCode = 201

  const { responses } = res.locals.submission as DecryptedContent
  const userInstructions = makeUserInstructions({ responses })
  const to = [userInstructions.requesterEmail]
  const { teamName } = userInstructions
  const users = {
    ...userInstructions.users,
    notFound: [] as string[],
  }
  try {
    logger?.info(`[${submissionId}] Adding/Removing users`)
    users.notFound = await manageTeam(userInstructions)

    users.add = users.add.filter((u) => !users.notFound.includes(u))
    users.remove = users.remove.filter((u) => !users.notFound.includes(u))

    if (!users.add.length) {
      users.add.push('N/A')
    }
    if (!users.remove.length) {
      users.remove.push('N/A')
    }
    if (!users.notFound.length) {
      users.notFound.push('N/A')
    }
    const successText = onSuccess(teamName, users)
    await mailOutcome({
      to,
      submissionId,
      repoName: teamName,
      action,
      successText,
    })
  } catch (error) {
    statusCode = 400
    logger?.error(error)
    await mailOutcome({ to, submissionId, repoName: teamName, action, error })
  } finally {
    const message =
      statusCode !== 201 ? 'Request processed with errors' : 'Request processed'
    res.status(statusCode).json({ message })
  }
}

import { ResultAsync } from 'neverthrow'
import { generateFromBaseRepo } from './site-generator'
import { logger } from '../logger'
import { publishToGitHub } from './github-publisher'
import { mailOutcome } from './outcome-mailer'

const onSuccess = (repoName: string) => (supportEmail: string) => `
The Isomer site for ${repoName} has been created successfully! 
Please follow up by doing the following:

Setup a GitHub account for yourself and others who will
edit the site by following the instructions in the link below:
https://v2.isomer.gov.sg/setup/create-a-github-account

Send this mail to ${supportEmail} with your GitHub usernames 
to give yourself and other users access to the repository.

The Isomer guide is available at https://v2.isomer.gov.sg.
`

const action = 'creating'

export const createSite = (
  submissionId: string,
  repoName: string,
  requestorEmail: string
) => {
  return ResultAsync.fromPromise(
    generateFromBaseRepo(repoName),
    () => new Error('Could not generate site from base repo.')
  )
    .andThen(() => {
      logger.info(`[${submissionId}] Publishing to GitHub`)
      return ResultAsync.fromPromise(
        publishToGitHub(repoName),
        () => new Error('Could not publish to GitHub.')
      )
    })
    .andThen(() => {
      logger.info(`[${submissionId}] Mailing outcome`)
      const successText = onSuccess(repoName)
      return ResultAsync.fromPromise(
        mailOutcome({
          to: requestorEmail,
          submissionId,
          repoName,
          action,
          successText,
        }),
        () => new Error('Could not mail success outcome.')
      )
    })
    .mapErr(async (error) => {
      // Log and mail any error
      logger.error(error)
      try {
        await mailOutcome({
          to: requestorEmail,
          submissionId,
          repoName,
          action,
          error,
        })
      } catch (_e) {
        // Ignore any error
      }
      return error
    })
}

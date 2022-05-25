import { ResultAsync } from 'neverthrow'
import { generateFromBaseRepo, editConfigYml } from './site-generator'
import { publishToAmplify } from './amplify-publisher'
import { logger } from '../logger'
import { publishToGitHub, modifyUrls } from './github-publisher'
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
    (e) => new Error(`Could not generate site from base repo: ${e}`)
  )
    .andThen(() => {
      logger.info(`[${submissionId}] Publishing to '${repoName}' GitHub`)
      return ResultAsync.fromPromise(
        publishToGitHub(repoName),
        (e) => new Error(`Could not publish to GitHub: ${e}`)
      )
    })
    .andThen((repoId) => {
      logger.info(`[${submissionId}] Publishing to Amplify`)
      return publishToAmplify(repoName, repoId)
    })
    .andThen((createResult) => {
      // This second push serves a dual purpose. It sets the site URLs in _config.yml (which may not be important)
      // and it kicks off the initial Amplify build for each branch (which is very important).
      editConfigYml(createResult.name, createResult.defaultDomain)
      return ResultAsync.fromPromise(
        modifyUrls(createResult.name, createResult.defaultDomain),
        (e) => new Error(`Could not modify URLs in GitHub: ${e}`)
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
        (e) => new Error(`Could not mail success outcome: ${e}`)
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

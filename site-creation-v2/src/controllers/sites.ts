import { Request, Response } from 'express'
import { DecryptedContent, FormField } from '@opengovsg/formsg-sdk/dist/types'

import { logger } from '../logger'

import { createSite, CreateSiteProps } from '../services/create-site'

// interface Submission {
//   responses: FormField[]
// }
//
// const repoNameFromResponses = function ({ responses }: Submission): string {
//   const repoNameResponse = responses.find(
//     ({ question }) => question === 'Repository Name'
//   )
//   if (repoNameResponse && repoNameResponse.answer) {
//     return repoNameResponse.answer
//   }
//
//   return ''
// }
//
// const requestorEmailFromResponses = function ({
//   responses,
// }: Submission): string {
//   const requestorEmailResponse = responses.find(
//     ({ question }) => question === 'Government E-mail'
//   )
//   if (requestorEmailResponse && requestorEmailResponse.answer) {
//     return requestorEmailResponse.answer
//   }
//   return ''
// }

const getProp = function (
  responses: FormField[],
  name: string
): string | undefined {
  const response = responses.find(({ question }) => question === name)

  return response?.answer
}

const getSiteProps = function (
  submissionId: string,
  responses: FormField[]
): CreateSiteProps {
  const requestorEmail = getProp(responses, 'Government E-mail')
  const agencyName = getProp(responses, 'Agency')
  const repoName = getProp(responses, 'Repository Name')
  const siteName = getProp(responses, 'Site Name')
  const contact = getProp(responses, 'Point of Contact')

  if (!requestorEmail || !agencyName || !repoName || !contact) {
    throw new Error('Required inputs not found')
  }

  return {
    submissionId,
    agencyName,
    repoName,
    requestorEmail,
    siteName,
    contact,
  }
}

export default async (req: Request, res: Response) => {
  const { submissionId } = req.body.data

  logger.info(`[${submissionId}] Handling create-site submission`)

  const { responses } = res.locals.submission as DecryptedContent
  const siteProps = getSiteProps(submissionId, responses)

  return createSite(siteProps)
    .map(() => {
      // Return success
      return res.status(201).json({ message: 'Request processed' })
    })
    .mapErr((err) => {
      // Return failure
      return res
        .status(400)
        .json({ message: `Request processed with errors: ${err}` })
    })
}

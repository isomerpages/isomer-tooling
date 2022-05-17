import { Request, Response } from 'express'
import { DecryptedContent, FormField } from '@opengovsg/formsg-sdk/dist/types'

import { logger } from '../logger'

import { createSite } from '../services/create-site'

interface Submission {
  responses: FormField[]
}

const repoNameFromResponses = function ({ responses }: Submission): string {
  const repoNameResponse = responses.find(
    ({ question }) => question === 'Repository Name'
  )
  if (repoNameResponse && repoNameResponse.answer) {
    return repoNameResponse.answer
  }

  return ''
}

const requestorEmailFromResponses = function ({
  responses,
}: Submission): string {
  const requestorEmailResponse = responses.find(
    ({ question }) => question === 'Government E-mail'
  )
  if (requestorEmailResponse && requestorEmailResponse.answer) {
    return requestorEmailResponse.answer
  }

  return ''
}

export default async (req: Request, res: Response) => {
  const { submissionId } = req.body.data

  logger.info(`[${submissionId}] Handling create-site submission`)

  const { responses } = res.locals.submission as DecryptedContent
  const repoName = repoNameFromResponses({ responses })
  const requestorEmail = requestorEmailFromResponses({ responses })

  return createSite(submissionId, repoName, requestorEmail)
    .map(() => {
      // Return success
      return res.status(201).json({ message: 'Request processed' })
    })
    .mapErr(() => {
      // Return failure
      return res.status(400).json({ message: 'Request processed with errors' })
    })
}

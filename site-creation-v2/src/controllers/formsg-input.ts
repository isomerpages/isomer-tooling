import express from 'express'
import { Request, Response, NextFunction } from 'express'
import formsgSdk from '@opengovsg/formsg-sdk'
import {
  DecryptParams,
  DecryptedContent,
} from '@opengovsg/formsg-sdk/dist/types'
import winston from 'winston'

import { logger } from '../logger'

interface CanDecryptFormSGPayload {
  webhooks: {
    authenticate: (_header: string, _uri: string) => void
  }
  crypto: {
    decrypt: (
      _formCreateKey: string,
      _decryptParams: DecryptParams
    ) => DecryptedContent | null
  }
}

interface FormSGExpressOptions {
  formKey: string
  formsg?: CanDecryptFormSGPayload
  logger?: winston.Logger
}

const formsg = formsgSdk()

export default ({
  formKey,
}: FormSGExpressOptions): Array<
  (_req: Request, _res: Response, _next: NextFunction) => void
> => [authenticate, express.json(), decrypt({ formKey })]

const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const signature = req.get('X-FormSG-Signature')
    if (!signature) {
      res.status(401).send({ message: 'Signature missing' })
    } else {
      formsg.webhooks.authenticate(
        signature,
        `https://${req.get('host')}${req.baseUrl}${req.path}`
      )
      // Continue processing the POST body
      next()
    }
  } catch (e) {
    logger?.error(e)
    res.status(401).send({ message: 'Unauthorized' })
  }
}

const decrypt = ({ formKey }: { formKey: string }) => (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const submission = formsg.crypto.decrypt(
      formKey,
      // If `verifiedContent` is provided in `req.body.data`, the return object
      // will include a verified key.
      req.body.data
    )

    // If the decryption failed, submission will be `null`.
    if (submission) {
      // Continue processing the submission
      res.locals.submission = submission
      next()
    } else {
      res.status(422).send({ message: 'Bad submission' })
    }
  } catch (e) {
    logger?.error(e)
    res.status(401).send({ message: 'Unauthorized' })
  }
}

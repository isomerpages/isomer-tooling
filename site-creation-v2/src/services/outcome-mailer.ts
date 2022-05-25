import nodemailer, { SendMailOptions } from 'nodemailer'

import { logger } from '../logger'

import config from '../config'
import * as aws from '@aws-sdk/client-ses'
import { defaultProvider } from '@aws-sdk/credential-provider-node'

const errorText = (
  repoName: string,
  supportEmail: string,
  submissionId: string,
  error: unknown
) => `
We were unable to perform the operation for ${repoName}.

Please follow up by sending a mail to ${supportEmail},
quoting the submission id [${submissionId}] and the following error:

${error}
`

const makeTransport = (nodeEnv: string) =>
  nodeEnv === 'production'
    ? nodemailer.createTransport({
        SES: {
          ses: new aws.SES({
            apiVersion: '2010-12-01',
            region: config.get('awsRegion'),
            credentialDefaultProvider: defaultProvider,
          }),
          aws,
        },
      })
    : {
        sendMail: async (options: SendMailOptions) =>
          logger.info(
            `In a production evironment the following mail would be sent - ${JSON.stringify(
              options,
              null,
              2
            )}`
          ),
      }

export const mailOutcome = async ({
  to,
  submissionId,
  repoName,
  action,
  error,
  successText,
}: {
  to: string | string[]
  submissionId: string
  repoName: string
  action: string
  error?: unknown
  successText?: (_supportEmail: string) => string
}): Promise<void> => {
  const supportEmail = config.get('supportEmail')
  const transport = makeTransport(config.get('nodeEnv'))
  const subject = error
    ? `[Isomer] Error ${action} ${repoName}`
    : `[Isomer] Success in ${action} ${repoName}`
  const text = error
    ? errorText(repoName, supportEmail, submissionId, error)
    : successText && successText(supportEmail)
  try {
    await transport.sendMail({
      to,
      cc: supportEmail,
      from: supportEmail,
      subject,
      text,
    })
  } catch (err) {
    logger.error(err)
  }
}

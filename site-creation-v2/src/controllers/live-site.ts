import { Request, Response } from 'express'

import { logger } from '../logger'
import config from '../config'

import { DecryptedContent, FormField } from '@opengovsg/formsg-sdk/dist/types'

import { mailOutcome } from '../services/outcome-mailer'
import { createDomainRedirect } from '../services/create-domain-redirect'
import makeZoneCreator from '../services/create-keycdn-zone'
import makeZoneAliaser from '../services/add-zone-alias'
import verifyDns from '../services/verify-dns'

const onSuccess = ({
  repoName,
  zoneName,
  domainName,
}: {
  repoName: string
  zoneName: string
  domainName: string
}) => () => `
The Isomer site for ${repoName} has been made live successfully! 
Please note the following:

KeyCDN Zone at ${zoneName}

Zone Aliased to ${domainName}

If your domain name starts with www, a request has been filed
to redirect your root domain to your www domain.
`

const action = 'creating'

const keyCDNAccessToken = config.get('keyCDNAccessToken')
const createKeyCDNZone = makeZoneCreator({ keyCDNAccessToken })
const addZoneAlias = makeZoneAliaser({ keyCDNAccessToken })

type SiteDetails = {
  repoName: string
  requesterEmail: string
  domainName: string
}

const getLiveSiteDetails = function ({
  responses,
}: {
  responses: FormField[]
}): SiteDetails {
  const siteDetails: SiteDetails = {
    repoName: '',
    requesterEmail: '',
    domainName: '',
  }

  const requestorEmailResponse = responses.find(
    ({ question }) => question === 'Government E-mail'
  )
  if (requestorEmailResponse && requestorEmailResponse.answer) {
    siteDetails.requesterEmail = requestorEmailResponse.answer
  }

  const repoNameResponse = responses.find(
    ({ question }) => question === 'Repository Name'
  )
  if (repoNameResponse && repoNameResponse.answer) {
    siteDetails.repoName = repoNameResponse.answer
  }

  const domainNameResponse = responses.find(
    ({ question }) => question === 'Domain Name'
  )
  if (domainNameResponse && domainNameResponse.answer) {
    siteDetails.domainName = domainNameResponse.answer
  }
  siteDetails.domainName = siteDetails.domainName.replace(/^\w+:\/\//, '')
  if (siteDetails.domainName.split('.').length === 3) {
    siteDetails.domainName = 'www.' + siteDetails.domainName
  }

  return siteDetails
}
export default async (req: Request, res: Response): Promise<void> => {
  const { submissionId } = req.body.data

  logger?.info(`[${submissionId}] Handling live-site submission`)
  let statusCode = 200

  const { responses } = res.locals.submission as DecryptedContent

  const { requesterEmail: to, repoName, domainName } = getLiveSiteDetails({
    responses,
  })

  try {
    logger?.info(`[${submissionId}] Adding KeyCDN Zone`)
    const { zoneName, zoneId } = await createKeyCDNZone(repoName)

    logger?.info(`[${submissionId}] Verifying DNS records`)
    await verifyDns(domainName, zoneName)

    logger?.info(
      `[${submissionId}] Adding Zone Alias ${domainName} to ${zoneId}`
    )
    await addZoneAlias(domainName, zoneId)

    if (domainName.startsWith('www.')) {
      logger?.info(`[${submissionId}] Filing pull request for ${domainName}`)
      await createDomainRedirect(domainName)
    }

    logger?.info(`[${submissionId}] Mailing outcome`)
    const successText = onSuccess({ repoName, zoneName, domainName })
    await mailOutcome({ to, submissionId, repoName, action, successText })
  } catch (error) {
    statusCode = 400
    logger?.error(error)
    await mailOutcome({ to, submissionId, repoName, action, error })
  } finally {
    const message =
      statusCode !== 200 ? 'Request processed with errors' : 'Request processed'
    res.status(statusCode).json({ message })
  }
}

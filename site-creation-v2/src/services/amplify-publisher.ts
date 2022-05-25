import { errAsync, ResultAsync } from 'neverthrow'
import {
  AmplifyClient,
  CreateAppCommand,
  CreateAppCommandInput,
  CreateAppCommandOutput,
  CreateBranchCommand,
  CreateBranchCommandInput,
  CreateBranchCommandOutput,
  Stage,
} from '@aws-sdk/client-amplify'

import config from '../config'
import { logger } from '../logger'

export interface AmplifyInfo {
  name: string
  arn: string
  id: string
  defaultDomain: string
  repository: string
}

export class AmplifyError extends Error {
  appName?: string
  appArn?: string
  appId?: string
  public constructor(
    msg: string,
    appName?: string,
    appArn?: string,
    appId?: string
  ) {
    super(msg)
    this.appName = appName
    this.appArn = appArn
    this.appId = appId
  }
}

const client = new AmplifyClient({
  region: config.get('awsRegion'),
})

const buildSpec = `
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - bundle install
    build:
      commands:
        - curl https://raw.githubusercontent.com/opengovsg/isomer-build/amplify/build.sh | bash
  artifacts:
    baseDirectory: _site
    files:
      - '**/*'
  cache:
    paths: []
`

export const publishToAmplify = (repoName: string, repoId: number) => {
  // const repository = `https://github.com/isomerpages/${repoName}/tree/master`
  const repository = `https://github.com/isomerpages/${repoName}.git`
  const options: CreateAppCommandInput = {
    name: repoName,
    accessToken: config.get('githubAccessToken'),
    repository,
    buildSpec,
  }

  logger.info(`PublishToAmplify ${repository} (ID: ${repoId})`)

  // 1. Create App
  return (
    ResultAsync.fromPromise(
      client.send(new CreateAppCommand(options)),
      (e) => new AmplifyError(`Publish to Amplify failed: ${e}`)
    )
      .andThen((out: CreateAppCommandOutput) => {
        logger.debug(`CreateAppCommandOutput: ${JSON.stringify(out, null, 2)}`)
        const { app } = out

        if (!app) {
          return errAsync(
            new Error('Successful CreateApp returned null app result.')
          )
        }
        const { appArn, appId, name, defaultDomain } = app
        logger.info(
          `Successfully published '${name}' (appId: ${appId}, ${appArn})`
        )
        const amplifyInfo: AmplifyInfo = {
          name: name || repoName,
          arn: appArn || '',
          id: appId || '',
          defaultDomain: defaultDomain || `${appId}.amplifyapp.com`,
          repository,
        }

        // 2. Create Master branch
        const options: CreateBranchCommandInput = {
          appId,
          framework: 'Jekyll',
          branchName: 'master',
          stage: Stage.PRODUCTION,
        }
        return ResultAsync.fromPromise(
          client.send(new CreateBranchCommand(options)),
          (e) =>
            new AmplifyError(
              `Create Amplify master branch failed: ${e}`,
              name,
              appArn,
              appId
            )
        ).map((out: CreateBranchCommandOutput) => {
          logger.debug(
            `Successfully created master branch: ${JSON.stringify(
              out,
              null,
              2
            )}`
          )
          return amplifyInfo
        })
      })

      // 3. Create Staging branch
      .andThen((amplifyInfo: AmplifyInfo) => {
        const options: CreateBranchCommandInput = {
          appId: amplifyInfo.id,
          framework: 'Jekyll',
          branchName: 'staging',
          stage: Stage.DEVELOPMENT,
        }
        return ResultAsync.fromPromise(
          client.send(new CreateBranchCommand(options)),
          (e) =>
            new AmplifyError(
              `Create Amplify staging branch failed: ${e}`,
              amplifyInfo.name,
              amplifyInfo.arn,
              amplifyInfo.id
            )
        ).map((out: CreateBranchCommandOutput) => {
          logger.debug(
            `Successfully created staging branch: ${JSON.stringify(
              out,
              null,
              2
            )}`
          )
          return amplifyInfo
        })
      })
  )
}

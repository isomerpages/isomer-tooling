#!/usr/bin/env node

import { logger, configureCliLogger } from './logger'
import yargs from 'yargs/yargs'
import { createSite } from './services/create-site'

configureCliLogger()

// To add a command, see https://github.com/yargs/yargs/blob/main/docs/advanced.md

const argv = yargs(process.argv.slice(2))
  .parserConfiguration({
    'camel-case-expansion': false,
  })
  .usage('\nUsage:\n\n' + '  $0 --repoName <name>')
  .options({
    r: {
      alias: 'repoName',
      type: 'string',
      describe: 'the name of the Isomer repository',
      demandOption: true,
    },
    e: {
      alias: 'requestorEmail',
      type: 'string',
      describe: 'email of the person requesting the repository',
      demandOption: true,
      default: 'support@isomer.gov.sg',
    },
  })
  .parseSync()

const { e: requestorEmail, r: repoName } = argv

logger.info(`Generate ${repoName}`)
createSite('cli-submission', repoName, requestorEmail)

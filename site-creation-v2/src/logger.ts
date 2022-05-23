import winston from 'winston'

import config from './config'

const makeWebLogger = () =>
  winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
      )
    ),
    transports: [new winston.transports.Console()],
    level: config.get('nodeEnv') === 'production' ? 'info' : 'debug',
  })

export let logger = makeWebLogger() // Make sure something is configured

export const configureWebLogger = (): void => {
  logger = makeWebLogger()
}

export const configureCliLogger = (): void => {
  // Just use Web Logger for now. Might change in the future.
  logger = makeWebLogger()
}

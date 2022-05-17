import express from 'express'
import morgan from 'morgan'
import { logger } from './logger'

import config from './config'

import { createSite, manageUsers, liveSite, formsgInput } from './controllers'

const formCreateKey = config.get('formCreateKey')
const formUsersKey = config.get('formUsersKey')
const formLiveKey = config.get('formLiveKey')

const app = express()

app.use(morgan('common'))

if (formCreateKey) {
  logger.info('Initializing Middleware for /sites')
  app.post('/sites', formsgInput({ formKey: formCreateKey }), createSite)
}

if (formUsersKey) {
  logger.info('Initializing middleware for /users')
  app.post('/users', formsgInput({ formKey: formUsersKey }), manageUsers)
}

if (formLiveKey) {
  logger.info('Initializing middleware for /live')
  app.post('/live', formsgInput({ formKey: formLiveKey }), liveSite)
}

export default app

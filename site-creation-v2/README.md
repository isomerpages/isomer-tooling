# site-creation-backend

Creates Isomer sites from FormSG site creation requests

# Overview

Isomer allows users to perform certain administrative tasks themselves, namely:

- Creating a GitHub repository and accompanying Netlify sites
- Add and removing users from their GitHub team, and;
- Setting up of KeyCDN for the website, along with DNS aliases (go-live)

This is done through several FormSG forms managed by the Isomer team.

Users have to verify through e-mail that they are Singapore Government personnel
in order to use the forms.

Form submissions are then sent via webhook to site-creation-backend to trigger
the appropriate calls to GitHub, Netlify and KeyCDN.

# Architecture

This application is built using TypeScript and Express.js; code is currently
organised into middleware, controllers and services. Controllers make calls 
to set-up infrastructure through services.  

For each form webhook, we mount two controllers, one for webhook payload decryption
and one to handle the actual request. This is bootstrapped at `express.ts`.

site-creation-backend has two possible entrypoints:
  - `index.ts` launches a standard Express.js application
  - `serverless.ts` is an adapter for the application into
    an AWS Lambda function

# Development Setup

- Make copies of the forms using your own FormSG account
  - Take care to use storage mode
- Use ngrok to expose port 8080 on your local machine as a
  https host on ngrok, ie, `npx ngrok https 8080`
- Set the webhook of each form to the corresponding path
  on site-creation-backend on the ngrok host
- Study `config.ts` to set the appropriate env vars.
  Note that site-creation-backend will directly manipulate
  GitHub, Netlify and KeyCDN.
- `npm run dev`

# Deployment
Make sure to build before you try to deploy (`npm run build`).

This application is deployed into AWS Lambda; each
endpoint exposed is handled by a separate lambda function that happens
to share the same codebase. 

The lambda codebase in turn is the Express.js application wrapped by 
[serverless-http](https://github.com/dougmoscrop/serverless-http).

## Manual Deployment
This application is set up to use [Lambda Function URLs](https://www.serverless.com/framework/docs/providers/aws/guide/functions#lambda-function-urls)
instead of an API Gateway. Deploying this way means that each function will get its own sub-domain, 
but (confusingly) each endpoint must still include the function name in the path 
(e.g. https://rghgtljmksnniwtlqivxozpwse0ovptv.lambda-url.ap-southeast-1.on.aws/sites) 

To deploy to staging:
- Open a shell and cd into the project root folder (where this README.md is stored).
- Make sure environment variables are in your shell's environment by putting the needed variables in `.env` 
  and running `source .env`. (Alternatively, you may install [direnv](https://direnv.net/), which will run `source .env`
  automatically when you cd into the project root folder.)
- Specify an AWS account to use for deployment. You can do this in one of the following ways:
  - Define the environment variables `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` for your account or another one
    with permission to deploy.
  - Set up a default [aws profile](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html)
    for an account with permission to deploy.
  - Set up a named [aws profile](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html)
    for an account with permission to deploy (e.g. `cicd-serverless`) and do one of the following:
    - Define the environment variable `AWS_PROFILE` (e.g. `AWS_PROFILE="cicd-serverless" npx serverless deploy`)
    - Specify the profile on the command line (e.g. `npx serverless deploy --aws-profile cicd-serverless`)
- After you have completed the above steps, run `npx serverless deploy` (or simply `serverless deploy`, 
  if you have installed serverless globally).

To deploy to production, follow the same procedure for deploying to staging, with the following modifications:
- Modify `.env` to define production variables and reload environment into your shell, 
  e.g. `direnv reload` if you use [direnv](https://direnv.net/). 
- Specify the production stage on the command line, e.g. `npx serverless deploy --stage production`

## Incremental deployment
If you make edits that don't change `serverless.yml`, then you can deploy quickly with commands like the following:

```
npm run build
npx serverless deploy function --function sites
```
serverless explains how this is different from a normal deployment: 
> This deployment method does not touch your AWS CloudFormation Stack. Instead, it simply overwrites the zip file of the current function on AWS. This method is much faster, since it does not rely on CloudFormation.

# Viewing logs
Logs can be viewed in the AWS console or on the command line as follows:

- `npx serverless logs --function sites`: View staging logs for the `sites` function.
- `npx serverless logs --function sites --stage production`: View production logs for the `sites` function.
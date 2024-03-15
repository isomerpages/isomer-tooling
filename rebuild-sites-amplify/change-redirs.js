const {
  AmplifyClient,
  ListAppsCommand,
  UpdateAppCommand,
} = require("@aws-sdk/client-amplify");

const MAX_RESULTS_PER_PAGE = 100

const awsClient = new AmplifyClient({
  region: "ap-southeast-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

async function changeRedirs() {
  let sitesList = {}
  let nextToken
  const listCommand = new ListAppsCommand({
    maxResults: MAX_RESULTS_PER_PAGE,
  })
  let response = await (awsClient.send(listCommand))
  nextToken = response.nextToken
  while (nextToken) {
    response.apps.forEach(app => {
      if (!app.name) return
      sitesList[app.name] = {
        appId: app.appId,
        branchName: 'master',
        jobType: 'RELEASE',
        customRules: app.customRules
      }
    })
    const listCommand = new ListAppsCommand({
      maxResults: MAX_RESULTS_PER_PAGE,
      nextToken
    })
    response = await (awsClient.send(listCommand))
    nextToken = response.nextToken
  }
  for (const site in sitesList) {
    const siteInfo = sitesList[site]
    let alreadyHasRule = false
    siteInfo.customRules.forEach(rule => {
      if (rule.source.toLowerCase() === "</%5c/>") alreadyHasRule = true
    })
    if (alreadyHasRule) {
      console.log(`${site} already has redirect rule`)
      continue
    }
    const newCustomRules = [
      {
        source: "</%5c/>",
        target: "/404.html",
        status: 302
      },
      {
        source: "</%5C/>",
        target: "/404.html",
        status: 302
      }
    ]
    const updatedCustomRules = newCustomRules.concat(siteInfo.customRules)
  
    const updateInput = {
      appId: siteInfo.appId,
      customRules: updatedCustomRules
    }
    const updateCommand = new UpdateAppCommand(updateInput)
    const resp = await awsClient.send(updateCommand)
  }
}

changeRedirs()
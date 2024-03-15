const {
  AmplifyClient,
  StartJobCommand,
  ListAppsCommand,
} = require("@aws-sdk/client-amplify");
const awsClient = new AmplifyClient({
  region: "ap-southeast-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const MAX_RESULTS_PER_PAGE = 100

async function rebuildAllAmplifySites() {
  let sitesList = {}
  let nextToken
  const listCommand = new ListAppsCommand({
    maxResults: MAX_RESULTS_PER_PAGE,
  })
  response = await (awsClient.send(listCommand))
  nextToken = response.nextToken
  while (nextToken) {
    response.apps.forEach(app => {
      if (!app.name) return
      sitesList[app.name] = {
        appId: app.appId,
        branchName: 'master',
        jobType: 'RELEASE'
      }
    })
    const listCommand = new ListAppsCommand({
      maxResults: MAX_RESULTS_PER_PAGE,
      nextToken
    })
    response = await (awsClient.send(listCommand))
    nextToken = response.nextToken
  }
  console.log(sitesList)
  for (const site in sitesList) {
    const rebuildCommand = new StartJobCommand(sitesList[site])
    try {
      const resp = await awsClient.send(rebuildCommand)
    } catch (e) {
      console.log(`Error for site ${site}: ${e}`)
    }
    
  }
}

rebuildAllAmplifySites()
import {
  AmplifyClient,
  ListJobsCommand,
  ListJobsCommandInput,
  ListAppsCommandInput,
  ListAppsCommand,
  App,
  JobStatus,
  ListJobsCommandOutput,
} from "@aws-sdk/client-amplify";

const amplifyClient = new AmplifyClient({
  region: "ap-southeast-1",
});

const BRANCH_NAME = "staging";

const createListJobsCommand = (input: ListJobsCommandInput) => {
  return new ListJobsCommand(input);
};

const createListAppsCommand = (input: ListAppsCommandInput) => {
  return new ListAppsCommand(input);
};

// get all app with pagination
const getAllApps = async () => {
  let token: string | undefined;
  const apps: App[] = [];
  do {
    const listAppsCommand = createListAppsCommand({
      nextToken: token,
      maxResults: 100,
    });
    const listAppsCommandOutput = await amplifyClient.send(listAppsCommand);
    token = listAppsCommandOutput.nextToken;
    const outputApps = listAppsCommandOutput.apps;
    if (outputApps) apps.push(...outputApps);
  } while (token);
  return apps;
};

const getBuildStatus = async (): Promise<void> => {
  const apps = await getAllApps();
  for (const app of apps) {
    const listJobsCommand = createListJobsCommand({
      appId: app.appId,
      branchName: BRANCH_NAME,
      maxResults: 1,
    });
    let listJobsCommandOutput: ListJobsCommandOutput;
    try {
      listJobsCommandOutput = await amplifyClient.send(listJobsCommand);
    } catch (error) {
      console.log("error", error, app.name, app.appId);
      continue;
    }

    if (!listJobsCommandOutput.jobSummaries) {
      console.log("no job summaries", app.name, app.appId);
      continue;
    }

    const latestJob = listJobsCommandOutput.jobSummaries[0];
    if (latestJob && latestJob.status === JobStatus.FAILED) {
      // we note if build process failed
      console.log("status not success", app.name, app.appId);
    }
  }
};

getBuildStatus();

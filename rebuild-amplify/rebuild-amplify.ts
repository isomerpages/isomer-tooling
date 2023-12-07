import { createObjectCsvWriter } from "csv-writer";
import {
  AmplifyClient,
  ListJobsCommand,
  ListJobsCommandInput,
  ListAppsCommandInput,
  ListAppsCommand,
  App,
  JobStatus,
  ListJobsCommandOutput,
  Job,
  JobSummary,
  StartJobCommand,
} from "@aws-sdk/client-amplify";

const amplifyClient = new AmplifyClient({
  region: "ap-southeast-1",
});

const BRANCHES = {
  STAGING: "staging",
  MASTER: "master",
} as const;

const JOB_TYPE = "RETRY";
const JOB_RETRY_REASON = "Rebuild app to ensure govt icons links are updated";

// Define the path and name of the CSV file to write to
const csvFilePath = "build-times.csv";

// Define the CSV header row
const csvHeader = [
  { id: "timeToLive", title: "Time To Live" },
  { id: "buildTime", title: "Build Time" },
  { id: "name", title: "Name" },
];

// Define the CSV writer
const csvWriter = createObjectCsvWriter({
  path: csvFilePath,
  header: csvHeader,
});

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

const listLatestJobFor = async (
  app: App,
  branch: (typeof BRANCHES)[keyof typeof BRANCHES]
): Promise<JobSummary> => {
  const input = createListJobsCommand({
    appId: app.appId,
    branchName: branch,
    // NOTE: We only care about the latest job
    // as we only want to retry the latest job.
    // This is because retrying anything else will
    // result in a drift between CMS and the app
    maxResults: 1,
  });
  const output = await amplifyClient.send(input);
  return output.jobSummaries[0];
};

const retryJob = (
  job: JobSummary,
  appId: string,
  branch: (typeof BRANCHES)[keyof typeof BRANCHES]
): void => {
  const input = {
    appId,
    branchName: branch,
    jobId: job.jobId,
    jobType: JOB_TYPE,
    jobReason: JOB_RETRY_REASON,
  };
  const command = new StartJobCommand(input);
  amplifyClient.send(command);
};

const rebuildAllApps = async (): Promise<void> => {
  const apps = await getAllApps();
  apps.map(async (app) => {
    const latestJob = await listLatestJobFor(app, BRANCHES.STAGING);
    retryJob(latestJob, app.appId, BRANCHES.STAGING);
  });
};

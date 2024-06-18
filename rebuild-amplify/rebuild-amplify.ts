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
  UpdateAppCommand,
  GetAppCommand,
} from "@aws-sdk/client-amplify";
import Papa = require("papaparse");

import * as fs from "node:fs/promises";

const amplifyClient = new AmplifyClient({
  region: "ap-southeast-1",
});

const BRANCHES = {
  STAGING: "staging",
  MASTER: "master",
  STAGING_LITE: "staging-lite",
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
    try {
      const listAppsCommandOutput = await amplifyClient.send(listAppsCommand);
      token = listAppsCommandOutput.nextToken;
      const outputApps = listAppsCommandOutput.apps;
      if (outputApps) apps.push(...outputApps);
    } catch (e) {
      console.error(`Error occurred in for loop of getAllApps`, e);
    }
  } while (token);
  const appIds = apps.map((app) => app.appId);
  console.log(appIds);
  const appsCsv = Papa.unparse(apps, { header: true });
  await fs.writeFile("apps.csv", appsCsv);
  return apps;
};


const listLatestJobFor = async (
  appId: string,
  branch: (typeof BRANCHES)[keyof typeof BRANCHES]
): Promise<JobSummary> => {
  const input = createListJobsCommand({
    appId,
    branchName: branch,
    // NOTE: We only care about the latest job
    // as we only want to retry the latest job.
    // This is because retrying anything else will
    // result in a drift between CMS and the app
    maxResults: 1,
  });
  try {
    const output = await amplifyClient.send(input);
    return output.jobSummaries[0];
  } catch (e) {
    console.error(`Error occurred in listLatestJobFor`, e);
  }
};

const retryJob = async (
  job: JobSummary,
  appId: string,
  branch: (typeof BRANCHES)[keyof typeof BRANCHES]
): Promise<void> => {
  const input = {
    appId,
    branchName: branch,
    jobId: job.jobId,
    jobType: JOB_TYPE,
    jobReason: JOB_RETRY_REASON,
  };
  const command = new StartJobCommand(input);
  await amplifyClient.send(command);
};

const modifyEnvVar = async (appId: string): Promise<void> => {
  const currentEnvVars = (
    await amplifyClient.send(new GetAppCommand({ appId }))
  ).app.environmentVariables;

  if (!currentEnvVars["_CUSTOM_IMAGE"]) {
    console.log("no custom image found, skipping", appId);
  }
  delete currentEnvVars["_CUSTOM_IMAGE"];

  if (!currentEnvVars["LC_ALL"]) {
    currentEnvVars["LC_ALL"] = "C.UTF-8"
  }

  if (!currentEnvVars["LANG"]) {
    currentEnvVars["LANG"] = "C.UTF-8"
  }

  const command = new UpdateAppCommand({
    appId,
    environmentVariables: currentEnvVars
  });
  console.log("About to send command", command, appId);
  await amplifyClient.send(command);
};

const rebuildAllApps = async (): Promise<void> => {
  await getAllApps();

  let apps: App[] = await promisifyPapaParse(
    await fs.readFile("apps.csv", "utf-8")
  );

  // todo: when modifying all the repos, recommended to 
  // do slicing in case of any rate limits  
  // apps = apps.slice();

  const blacklist = [
    // the list below are nextjs sites or test sites
    "d1pna4xeuwj0i3",
    "d2an0oz4gcja0b",
    "d1q764d34icpva",
    "d2hlsj8fqs2uyd",
    "dxonh6jngzf1c",
  ];
  apps = apps.filter((app) => !blacklist.includes(app.appId));

  // done sequentially so can hard stop on error 
  for (const app of apps) {
    const { appId, name } = app;
    try {
      await modifyEnvVar(appId);

      if (name.endsWith("staging-lite")) {
        const stgLiteJob = await listLatestJobFor(appId, BRANCHES.STAGING_LITE);
        if (stgLiteJob && stgLiteJob.status === JobStatus.FAILED) {
          await retryJob(stgLiteJob, appId, BRANCHES.STAGING_LITE);
        }
      } else {
        const stgLatestJob = await listLatestJobFor(appId, BRANCHES.STAGING);
        console.log(stgLatestJob);
        if (stgLatestJob && stgLatestJob.status === JobStatus.FAILED) {
          await retryJob(stgLatestJob, appId, BRANCHES.STAGING);
        }

        const prodLatestJob = await listLatestJobFor(appId, BRANCHES.MASTER);
        if (prodLatestJob && prodLatestJob.status === JobStatus.FAILED) {
          await retryJob(prodLatestJob, appId, BRANCHES.MASTER);
        }
      }

      console.log(`Succeeded for ${appId}, ${name}`)
    } catch (e) {
      console.error(`Error occurred in rebuildAllApps`, e, appId, name);
      throw e;
    }
  }
};

export function promisifyPapaParse<T>(content: string) {
  return new Promise<T>((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      complete(results) {
        // validate the csv
        if (!results.data) {
          reject(new Error("Failed to parse csv"));
        }
        resolve(results.data as T);
      },
      error(error: unknown) {
        reject(error);
      },
    });
  });
}

rebuildAllApps();

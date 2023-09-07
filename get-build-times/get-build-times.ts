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
} from "@aws-sdk/client-amplify";

const amplifyClient = new AmplifyClient({
  region: "ap-southeast-1",
});

const branchName = "staging";

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

interface buildTime {
  timeToLive: number;
  buildTime: number;
  name: string;
}

const getBuildTimes = async (): Promise<buildTime[]> => {
  const apps = await getAllApps();

  const buildTimes: buildTime[] = [];
  for (const app of apps) {
    const listJobsCommand = createListJobsCommand({
      appId: app.appId,
      branchName: branchName,
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

    if (latestJob.status !== JobStatus.SUCCEED) {
      // we skip if build process failed/running
      console.log("status not success", app.name, app.appId);
      continue;
    }
    const endTime = latestJob.endTime;
    const commitTime = latestJob.commitTime;
    const startTime = latestJob.startTime;

    if (!endTime || !commitTime || !startTime) {
      console.log("missing time info", app.name, app.appId);
      continue;
    }

    const timeToLiveInMinFloat =
      (endTime.getTime() - commitTime.getTime()) / 1000 / 60;
    // convert to 2 dp
    const timeToLive = Math.round(timeToLiveInMinFloat * 100) / 100;

    const buildTimeInMinFloat =
      (endTime.getTime() - startTime.getTime()) / 1000 / 60;
    // convert to 2 dp
    const buildTimeInMinute = Math.round(buildTimeInMinFloat * 100) / 100;

    buildTimes.push({
      timeToLive,
      buildTime: buildTimeInMinute,
      name: app.name || "Name does not exist",
    });
  }
  return buildTimes;
};

getBuildTimes().then((buildTimes) => {
  const csvData = buildTimes;
  csvWriter.writeRecords(csvData).then(() => {
    console.log("...Done");
  });
});

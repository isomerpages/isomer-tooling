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

    if (listJobsCommandOutput.jobSummaries[0].status !== JobStatus.SUCCEED) {
      // we skip if build process failed/running
      console.log("status not success", app.name, app.appId);
      continue;
    }

    const endTime = listJobsCommandOutput.jobSummaries[0].endTime;
    const commitTime = listJobsCommandOutput.jobSummaries[0].commitTime;
    const startTime = listJobsCommandOutput.jobSummaries[0].startTime;

    if (!endTime || !commitTime || !startTime) {
      console.log("missing time info", app.name, app.appId);
      continue;
    }

    const ttl = (endTime.getTime() - commitTime.getTime()) / 1000 / 60;
    const timeToLive = Math.round(ttl * 100) / 100;

    const build = (endTime.getTime() - startTime.getTime()) / 1000 / 60;
    const buildTime = Math.round(build * 100) / 100;

    buildTimes.push({
      timeToLive,
      buildTime,
      name: app.name || "Name does not exist",
    });
    break;
  }
  return buildTimes;
};

getBuildTimes().then((buildTimes) => {
  const csvData = buildTimes;
  csvWriter.writeRecords(csvData).then(() => {
    console.log("...Done");
  });
});

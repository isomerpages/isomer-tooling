const AWS = require("aws-sdk");
const fs = require("fs");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

AWS.config.update({ region: "ap-southeast-1" });

const amplify = new AWS.Amplify();

// Function to get all Amplify apps and write to a JSON file
const getAllApps = async () => {
  try {
    const apps = [];
    let nextToken;
    do {
      const params = { nextToken };
      const response = await amplify.listApps(params).promise();
      apps.push(...response.apps);
      nextToken = response.nextToken;
    } while (nextToken);

    const appData = apps.map((app) => ({ appId: app.appId, name: app.name }));
    fs.writeFileSync("amplify_apps.json", JSON.stringify(appData, null, 2));

    return appData;
  } catch (error) {
    console.error("Error fetching Amplify apps:", error);
  }
};

// Function to check the build status of specific branches and write to CSV files incrementally
const checkBuildStatuses = async (apps) => {
  // Commenting this out to allow for faster processing
  /* 
  const successCsvWriter = createCsvWriter({
    path: 'success.csv',
    header: [
      { id: 'appId', title: 'appId' },
      { id: 'appName', title: 'appName' },
      { id: 'branch', title: 'branch' },
      { id: 'buildStatus', title: 'buildStatus' }
    ],
    append: true
  });
  */

  const failedCsvWriter = createCsvWriter({
    path: "failed.csv",
    header: [
      { id: "appId", title: "appId" },
      { id: "appName", title: "appName" },
      { id: "branch", title: "branch" },
      { id: "buildStatus", title: "buildStatus" },
    ],
    append: true,
  });

  for (const app of apps) {
    const branches = ["master", "staging", "staging-lite"];
    for (const branchName of branches) {
      try {
        const response = await amplify
          .listJobs({ appId: app.appId, branchName })
          .promise();
        if (response.jobSummaries.length > 0) {
          const buildStatus = response.jobSummaries[0].status;
          const record = {
            appId: app.appId,
            appName: app.name,
            branch: branchName,
            buildStatus,
          };
          if (buildStatus === "SUCCEED") {
            // await successCsvWriter.writeRecords([record]);
          } else {
            // note this will also capture pending and running statuses
            await failedCsvWriter.writeRecords([record]);
          }
        }
      } catch (error) {
        if (error.code === "NotFoundException") {
          console.warn(`Branch ${branchName} not found for app ${app.appId}.`);
        } else {
          console.error(
            `Error fetching build status for app ${app.appId}, branch ${branchName}:`,
            error
          );
        }
      }
    }
  }
};

// Function to read apps from JSON file
const readAppsFromFile = () => {
  try {
    const data = fs.readFileSync("amplify_apps.json");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading apps from JSON file:", error);
    return [];
  }
};

// Main function to execute the script
const main = async () => {
  // Uncomment the following line to initially fetch and save the apps to a JSON file
  // await getAllApps();

  const apps = readAppsFromFile();
  await checkBuildStatuses(apps);
};

main();

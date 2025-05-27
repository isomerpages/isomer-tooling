// log-generator.js
const { exec } = require("child_process");
const util = require("util");
const fs = require("fs");
const path = require("path");
const https = require("https");

const execPromise = util.promisify(exec);

// Define the array of app-id/domain-name pairs
// e.g. { appId: "d3ezvmfssssilxq", domainName: "xyz.agency.gov.sg" }
// Note: don't need www or https:// prefix in domainName
const pairs = [];

// Set the starting time and ending time
const startTime = new Date("2025-04-01T00:00:00Z");
const endTime = new Date("2025-04-29T00:00:00Z");

// Interval to fetch for
let intervalMs = 3 * 60 * 60 * 1000;

// The IP to search for
const targetIp = "1.1.1.1";

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download file: ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close(resolve);
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => reject(err));
      });
  });
}

async function filterCsvFile(inputPath, outputPath, ip) {
  const data = await fs.promises.readFile(inputPath, "utf-8");
  const lines = data.split("\n");
  const filtered = lines.filter((line) => line.includes(ip));
  if (filtered.length > 0) {
    await fs.promises.writeFile(outputPath, filtered.join("\n"));
  } else {
    console.log(`No matches found for IP ${ip} in ${path.basename(inputPath)}`);
  }
}

async function generateLogs() {
  fs.mkdirSync("./logs", { recursive: true });
  fs.mkdirSync("./filtered-logs", { recursive: true });

  for (const { appId, domainName } of pairs) {
    console.log(`Processing ${domainName} (${appId})...`);

    let currentStart = new Date(startTime);
    let part = 1;

    while (currentStart < endTime) {
      let currentEnd = new Date(currentStart.getTime() + intervalMs);
      if (currentEnd > endTime) currentEnd = new Date(endTime);

      const startIso = currentStart.toISOString();
      const endIso = currentEnd.toISOString();

      console.log(`  Generating logs from ${startIso} to ${endIso}`);

      const command = `aws amplify generate-access-logs --app-id ${appId} --domain-name ${domainName} --start-time ${startIso} --end-time ${endIso}`;

      try {
        const { stdout } = await execPromise(command);

        // Assuming the S3 URL is in the stdout like "https://bucket.s3.amazonaws.com/path/to/file.csv"
        const urlMatch = stdout.match(/https?:\/\/[^\s"]+/);
        if (!urlMatch) {
          console.error("  No S3 URL found in AWS CLI output.");
        } else {
          const url = urlMatch[0];
          console.log(`  Downloading log from ${url}`);

          const filenameSafeDomain = domainName.replace(/\./g, "-");
          const localCsvPath = path.join(
            "logs",
            `${filenameSafeDomain}-part${part}.csv`
          );
          const filteredCsvPath = path.join(
            "filtered-logs",
            `${filenameSafeDomain}-part${part}.csv`
          );

          await downloadFile(url, localCsvPath);

          console.log(`  Filtering for IP ${targetIp}...`);
          await filterCsvFile(localCsvPath, filteredCsvPath, targetIp);

          part++;
        }
        currentStart = currentEnd;
        // Try to increase the interval for the next run
        if (intervalMs <= 6 * 60 * 60 * 1000) {
          intervalMs *= 2;
          console.log(
            `Increasing interval to ${intervalMs / (60 * 1000)} minutes`
          );
        }
      } catch (err) {
        console.error(
          `Error during logs for ${domainName} from ${startIso} to ${endIso}:`,
          err.message
        );
        // If the error is due to a timeout or similar, reduce the interval
        intervalMs /= 2; // (make it 1 hour)
        console.log(
          `  Retrying with a smaller interval of ${
            intervalMs / (60 * 1000)
          } minutes`
        );
      } finally {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
}

generateLogs().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

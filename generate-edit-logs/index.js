const { Octokit } = require("@octokit/rest");
const fs = require("fs");
const pg = require("pg");
const { program } = require("commander");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function getUserTable(repoName) {
  try {
    const client = new pg.Client({
      connectionString: process.env.DB_URI,
    });
    await client.connect();
    console.log("Connected to database");

    const res = await client.query(
      `SELECT id, email FROM users WHERE users.id IN (SELECT user_id FROM site_members WHERE site_id IN (SELECT site_id FROM repos WHERE name='${repoName}')) ORDER BY id;`
    );
    const result = {};
    res.rows.forEach((row) => {
      result[row.id] = row.email;
    });
    await client.end();
    return result;
  } catch (err) {
    console.log("Error retrieving data from database");
    console.log("Are you sure you have connected to the AWS VPN?");
    fs.appendFileSync(
      "generate-edit-logs-error.log",
      `Error retrieving user table from ${repoName}: ${err}\n`
    );
    throw err;
  }
}

async function getCommitsWithinDates(
  orgName,
  repoName,
  sinceDate,
  untilDate,
  userTable
) {
  try {
    const commits = await octokit.paginate(octokit.repos.listCommits, {
      owner: orgName,
      repo: repoName,
      since: sinceDate,
      until: untilDate,
      per_page: 100,
    });

    return commits
      .map((commit) => ({
        sha: commit.sha,
        date: commit.commit.author.date,
        name: commit.commit.author.name,
        message: commit.commit.message,
      }))
      .map((commit) => {
        if (commit.message.startsWith("{")) {
          try {
            const parsedMessage = JSON.parse(commit.message);
            return {
              sha: commit.sha,
              date: commit.date,
              name:
                parsedMessage.userId in userTable
                  ? userTable[parsedMessage.userId]
                  : commit.name,
              message: parsedMessage.message,
            };
          } catch (err) {
            fs.appendFileSync(
              "generate-edit-logs-error.log",
              `Error parsing JSON in commit ${commit.sha} from ${orgName}/${repoName}: ${err}\n`
            );
            return null;
          }
        }

        return commit;
      })
      .map((commit) => {
        return `(${commit.sha}, ${commit.date}) - ${commit.name} - ${commit.message}\n`;
      });
  } catch (err) {
    console.log(err);
    fs.appendFileSync(
      "generate-edit-logs-error.log",
      `Error retrieving commits from ${orgName}/${repoName}: ${err}\n`
    );
    return null;
  }
}

function getISO8601(dateString) {
  const date = new Date(dateString);
  return date.toISOString();
}

(async function () {
  try {
    program
      .name("node index.js")
      .description("Generate edit logs of Isomer repos")
      .requiredOption("-r, --repo <repoName>", "Name of repo, required")
      .option(
        "-o, --org <orgName>",
        "Name of GitHub organisation",
        "isomerpages"
      )
      .option(
        "-s, --since <since>",
        "List commits after this date (inclusive, YYYY-MM-DD). Defaults to start of time."
      )
      .option(
        "-u, --until <until>",
        "List commits before this date (inclusive, YYYY-MM-DD). Defaults to now."
      );

    program.parse();

    const options = program.opts();

    console.log("Generating edit logs...");
    const sinceDate = options.since
      ? getISO8601(options.since)
      : getISO8601("1970-01-01");
    const untilDate = options.until
      ? getISO8601(options.until)
      : getISO8601(new Date().toDateString());
    const userTable = await getUserTable(options.repo);
    const commits = await getCommitsWithinDates(
      options.org,
      options.repo,
      sinceDate,
      untilDate,
      userTable
    );

    fs.writeFileSync(`${options.repo}.log`, commits.join(""));
    console.log(`Done! Edit logs written to ${options.repo}.log`);
  } catch (err) {
    console.log(err);
    fs.appendFileSync(
      "generate-edit-logs-error.log",
      `Error generating edit logs: ${err}\n`
    );
    process.exit(1);
  }
})();

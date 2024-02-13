const { Octokit } = require("@octokit/rest");
const fs = require("fs");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const EXCLUDED_TEAMS = ["core", "core-intern", "iso-engineers"];

async function getAllTeams() {
  try {
    console.log("Getting all GitHub teams...");
    const teams = await octokit.paginate(octokit.teams.list, {
      org: "isomerpages",
    });

    return teams.filter((team) => !EXCLUDED_TEAMS.includes(team.slug));
  } catch (err) {
    console.error(err);
    fs.appendFileSync(
      "get-github-team-repos-error.log",
      `Error when getting list of GitHub teams: ${err}\n`
    );
  }
}

async function getAllTeamRepos(teams) {
  try {
    const teamRepos = {};
    for (const team of teams) {
      console.log(`Getting repos for team ${team.name}...`);
      const repos = await octokit.paginate(octokit.teams.listReposInOrg, {
        org: "isomerpages",
        team_slug: team.slug,
      });

      teamRepos[team.name] = repos;
    }

    return teamRepos;
  } catch (err) {
    console.error(err);
    fs.appendFileSync(
      "get-github-team-repos-error.log",
      `Error when getting list of GitHub team repos: ${err}\n`
    );
  }
}

async function main() {
  try {
    const teams = await getAllTeams();
    const teamRepos = await getAllTeamRepos(teams);

    let csv = "Team,Repo\n";
    let csvSuperTeams = "Team,Repo\n";

    for (const team in teamRepos) {
      const addToSuperTeam = teamRepos[team].length > 1;

      for (const repo of teamRepos[team]) {
        csv += `${team},${repo.name}\n`;
        if (addToSuperTeam) {
          csvSuperTeams += `${team},${repo.name}\n`;
        }
      }
    }

    fs.writeFileSync("github-team-repos.csv", csv);
    fs.writeFileSync("github-super-team-repos.csv", csvSuperTeams);
  } catch (err) {
    console.error(err);
    fs.appendFileSync(
      "get-github-team-repos-error.log",
      `Error getting GitHub team repos: ${err}\n`
    );
  }
}

main();

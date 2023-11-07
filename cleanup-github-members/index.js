const { Octokit } = require("@octokit/rest");
const fs = require("fs");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function deleteTeam(orgName, teamName) {
  try {
    fs.appendFileSync(
      "cleanup-github.log",
      `Deleting team ${teamName} from ${orgName}\n`
    );
    await octokit.teams.deleteInOrg({
      org: orgName,
      team_slug: teamName,
    });
  } catch (err) {
    console.log(err);
    fs.appendFileSync(
      "cleanup-github-error.log",
      `Error deleting team ${teamName} from ${orgName}: ${err}\n`
    );
  }
}

async function deleteUserFromOrg(orgName, userName) {
  try {
    fs.appendFileSync(
      "cleanup-github.log",
      `Deleting user ${userName} from ${orgName}\n`
    );
    await octokit.orgs.removeMember({
      org: orgName,
      username: userName,
    });
  } catch (err) {
    console.log(err);
    fs.appendFileSync(
      "cleanup-github-error.log",
      `Error deleting user ${userName} from ${orgName}: ${err}\n`
    );
  }
}

async function getTeams(orgName) {
  try {
    const teams = await octokit.paginate(octokit.teams.list, {
      org: orgName,
      per_page: 100,
    });
    return teams;
  } catch (err) {
    console.log(err);
    fs.appendFileSync(
      "cleanup-github-error.log",
      `Error retrieving teams from ${orgName}: ${err}\n`
    );
    return null;
  }
}

async function getTeamRepos(orgName, teamName) {
  try {
    const repos = await octokit.paginate(octokit.teams.listReposInOrg, {
      org: orgName,
      team_slug: teamName,
      per_page: 100,
    });
    return repos;
  } catch (err) {
    console.log(err);
    fs.appendFileSync(
      "cleanup-github-error.log",
      `Error retrieving repos from ${orgName} for ${teamName}: ${err}\n`
    );
    return null;
  }
}

async function getUsersInOrg(orgName) {
  try {
    const users = await octokit.paginate(octokit.orgs.listMembers, {
      org: orgName,
      per_page: 100,
    });
    return users.map((user) => user.login);
  } catch (err) {
    console.log(err);
    fs.appendFileSync(
      "cleanup-github-error.log",
      `Error retrieving users from ${orgName}: ${err}\n`
    );
    return null;
  }
}

async function getAllUsersInTeams(orgName, excludedTeams = []) {
  const teams = await getTeams(orgName);
  const users = [];
  for (let team of teams) {
    if (excludedTeams.includes(team.name)) {
      continue;
    }

    try {
      const response = await octokit.paginate(octokit.teams.listMembersInOrg, {
        org: orgName,
        team_slug: team.name,
        per_page: 100,
      });
      const teamUsers = response.map((user) => user.login);
      users.push(...teamUsers);
    } catch (err) {
      console.log(err);
      fs.appendFileSync(
        "cleanup-github-error.log",
        `Error retrieving users from ${orgName} for ${team.name}: ${err}\n`
      );
    }
  }
  return users;
}

async function getTeamsWithNoRepos(orgName, dryRun = true) {
  const teams = await getTeams(orgName);
  const result = [];

  for (let team of teams) {
    const repos = await getTeamRepos(orgName, team.name);
    if (repos !== null && repos.length === 0) {
      if (!dryRun) {
        await deleteTeam(orgName, team.name);
      } else {
        fs.appendFileSync(
          "cleanup-github.log",
          `DRY RUN: Deleting team ${team.name} from ${orgName}\n`
        );
        result.push(team.name);
      }
    }
  }

  return result;
}

async function getUsersWithNoTeams(orgName, excludedTeams = [], dryRun = true) {
  const usersInOrg = await getUsersInOrg(orgName);
  const usersInTeams = await getAllUsersInTeams(orgName, excludedTeams);
  const usersNotInTeams = usersInOrg.filter(
    (user) => !usersInTeams.includes(user)
  );

  for (let user of usersNotInTeams) {
    if (!dryRun) {
      await deleteUserFromOrg(orgName, user);
    } else {
      fs.appendFileSync(
        "cleanup-github.log",
        `DRY RUN: Deleting user ${user} from ${orgName}\n`
      );
    }
  }
}

(async function () {
  try {
    if (process.argv.length === 3 && process.argv[2] === "--force") {
      await getTeamsWithNoRepos("isomerpages", false);
      await getUsersWithNoTeams("isomerpages", [], false);
    } else if (process.argv.length === 3 && process.argv[2] === "--dry-run") {
      console.log("Dry run only. No changes will be made.");
      const teams = await getTeamsWithNoRepos("isomerpages", true);
      await getUsersWithNoTeams("isomerpages", teams, true);
    } else {
      console.log("Run with --dry-run to see what changes the script will do.");
      console.log(
        "Run with --force when you are really sure to execute the changes!"
      );
      return;
    }

    console.log("Script has ended! Check the logs for more details.");
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
})();

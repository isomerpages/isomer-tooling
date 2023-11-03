const { Octokit } = require("@octokit/rest");
const fs = require("fs");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  request: {
    fetch: fetch,
  },
});

async function deleteTeam(orgName, teamName) {
  try {
    fs.appendFileSync(
      "cleanup-github.log",
      `Deleting team ${teamName} from ${orgName}\n`
    );
    await octokit.teams.delete({
      org: orgName,
      team_slug: teamName,
    });
  } catch (err) {
    console.log(err);
    fs.appendFileSync(
      "cleanup-github.log",
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
      "cleanup-github.log",
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
    return users;
  } catch (err) {
    console.log(err);
    fs.appendFileSync(
      "cleanup-github-error.log",
      `Error retrieving users from ${orgName}: ${err}\n`
    );
    return null;
  }
}

async function getAllUsersInTeams(orgName) {
  const teams = await getTeams(orgName);
  const users = [];
  for (let team of teams) {
    try {
      const teamUsers = await octokit.paginate(octokit.teams.listMembersInOrg, {
        org: orgName,
        team_slug: team.name,
        per_page: 100,
      });
      users.push(...teamUsers);
    } catch (err) {
      console.log(err);
      fs.appendFileSync(
        "cleanup-github-error.log",
        `Error retrieving users from ${orgName} for ${team.name}: ${err}\n`
      );
      return null;
    }
  }
  return users;
}

async function getTeamsWithNoRepos(orgName) {
  const teams = await getTeams(orgName);
  for (let team of teams) {
    const repos = await getTeamRepos(orgName, team.name);
    if (repos !== null && repos.length === 0) {
      // await deleteTeam(orgName, team.name);
      console.log(`Team ${team.name} has no repos!`);
      fs.appendFileSync(
        "cleanup-github-teams.log",
        `Team ${team.name} has no repos!\n`
      );
    }
  }
}

async function getUsersWithNoTeams(orgName) {
  const usersInOrg = await getUsersInOrg(orgName);
  const usersInTeams = await getAllUsersInTeams(orgName);
  const usersNotInTeams = usersInOrg.filter(
    (user) => !usersInTeams.includes(user)
  );
  for (let user of usersNotInTeams) {
    // await deleteUserFromOrg(orgName, user.login);
    console.log(`User ${user.login} is not in any teams!`);
    fs.appendFileSync(
      "cleanup-github-users.log",
      `User ${user.login} is not in any teams!\n`
    );
  }
}

(async function () {
  try {
    // getTeamsWithNoRepos("isomerpages");
    getUsersWithNoTeams("isomerpages");
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
})();

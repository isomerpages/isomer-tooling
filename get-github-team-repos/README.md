## Get repositories attached to each GitHub team

This script allows you to get the list of repositories that are attached to each GitHub team in the isomerpages organisation.

### Setup

This script queries the GitHub API, so you will need to set up your `GITHUB_TOKEN` to authenticate the API calls. To do that, ensure that the `GITHUB_TOKEN` environment variable is available inside your terminal session:

```
export GITHUB_TOKEN="<YOUR GITHUB TOKEN HERE>"
```

If you prefer, you can store this inside a `.env` file inside this directory,exporting the `GITHUB_TOKEN` inside, and then performing a `source .env`.

### Generating the list of repositories attached to each GitHub team

1. Ensure that you have your `GITHUB_TOKEN` exported into your terminal session.

2. Generate the list of repositories attached to each GitHub team by running the following command:

```
node index.js
```

3. The output of the script will be stored in 2 separate CSV files:

   1. `github-team-repos.csv` - represents the list of repositories attached to each GitHub team.

   2. `github-super-team-repos.csv` - represents the list of repositories attached to GitHub teams that have more than 1 repository attached to that team (a.k.a. "super teams").

4. If there are any errors, they will be printed to a `get-github-team-repos-error.log` file.

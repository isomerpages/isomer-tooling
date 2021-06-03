## Update Repo Files

The `update-repo-files` tool ensures that all Isomer repos **that are not using the new isomer-build build process** (i.e. non-CMS repos) have a consistent standard set of files (e.g. `.ruby-version`, `.gitignore`, `Gemfile`, `Gemfile.lock`). This tool helps the Isomer admins push the standard version of files out to all repos.

### How it works

The script calls the GitHub API for all repos associated with the `isomerpages` organization (except for the repos listed in the `repo-ignore.json` file). The script then pushes each **standard file** to the `staging` branch of the repo.

### How to run

The script is run on your local machine. 

First, update the .env file in the main directory with the `GITHUB_TOKEN_REPO_ACCESS` environment variable.

```
# pwd update-repo-files

source ../.env
npm install
node update.js
```
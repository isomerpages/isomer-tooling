## Cleanup GitHub membership

This script will delete all teams in the organisation that do not have repos attached to them. Thereafter, all members that do not belong to any team will be removed from the organisation.

Ensure that you have your `GITHUB_TOKEN` set up with minimally `admin:org` permissions (so that you can modify org and team memberships).

It is strongly recommended to do a dry run first, to determine if there are any issues with your setup:

```bash
node index.js --dry-run
```

The changes made will be logged into `cleanup-github.log`. Any errors will be printed to your terminal and a shorter log will be stored inside `cleanup-github-error.log`.

Once you are confident, delete those 2 files above (if any) and really perform the actions:

```bash
node index.js --force
```

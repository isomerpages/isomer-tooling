## Get list of repos

This script allows you to get the list of repos on Isomer, as well as their associated (if any):

1. Netlify staging site name and ID
2. Netlify production site name and ID
3. KeyCDN zone name, ID and status
4. AWS Amplify app name and ID

### Setup

This script queries the GitHub API, Netlify API, KeyCDN API and the AWS Amplify API, so you will need to set up the respective API tokens to authenticate the API calls. To do that, duplicate the `.env-example` file into `.env` and update the values accordingly:

- `GITHUB_TOKEN`: This is your personal access token from GitHub.
- `NETLIFY_ACCESS_TOKEN`: This is your personal access token from Netlify.
- `KEYCDN_API_KEY`: This is from 1password.

Additionally, you may need to [set up your AWS CLI credentials](https://docs.aws.amazon.com/signin/latest/userguide/command-line-sign-in.html) if you have never done so before. Otherwise, it is likely that you are already authenticated to AWS.

### Getting the list of repos

1. Ensure that you have set up the 3 environment variables listed above, and have authenticated to the AWS CLI.

2. Generate the list of repos by running the following command:

```
node index.js
```

3. The script will output 3 files:

   1. `list-of-repos.csv` - a comma-separated value file that indicates the repo name from GitHub, the associated Netlify staging/prod sites, the associated KeyCDN zone and the associated AWS Amplify app, if they were to exist respectively.

   2. `amplify-exceptions.log` - a list of apps that are found on AWS Amplify but do not map to a known GitHub repo.

   3. `netlify-exceptions.log` - a list of sites that are found on Netlify but do not map to a known GitHub repo. Note that this may include the CMS frontend itself.

4. If there are any errors, they will be printed to a `get-list-of-repos-error.log` file.

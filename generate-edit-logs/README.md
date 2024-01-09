## Generate site edit logs

This script allows you to generate a nicely formatted edit log for site owners to fulfill their compliance requirements.

### Setup

First, ensure that you are connected to the [AWS VPN](https://www.notion.so/opengov/Instructions-to-use-OGP-s-AWS-VPN-e67226703cac459999b84c02200a3940) as only the VPN is whitelisted to use the EC2 instance.

Next, you will require the correct environment variables and credentials.

- Go into the 1PW Isomer - Admin vault and search for the `.ssh/.env.<staging | prod>` file.
- Create a folder named .ssh in this directory and place the `.env` files there (i.e. `isomer-tooling/generate-edit-logs/.ssh`)
- Search for the corresponding credentials `isomercms-<staging | production>-bastion.pem`
- Put these credentials into the .ssh folder also.

### Generating the site edit logs

1. Ensure that you are in this current folder (`isomer-tooling/generate-edit-logs`).

2. Source your environment variables using `source .env`. The variables you will require are:

- `GITHUB_ACCESS_TOKEN` (Github personal access token)
- `DB_HOST` (read-only access to the production database, this is the hostname of the RDS instance)
- `SSH_USER` (Refer to our environment variables)
- `SSH_HOST` (Refer to our environment variables, points to our bastion host)
- `DB_URI` (Refer to our environment variables and ensure that the hostname is `localhost`, since we will be setting up the port-forwarding service in the next step)

3. Next, run the following command: `npm run jump:<staging | prod>`. This sets up the port-forwarding service.

4. Create another terminal window and repeat steps 1 and 2.

5. Generate the edit logs by running the following command:

```
node index.js --repo <repoName>
```

6. The edit logs will be generated and saved as `<repoName>.log` in this folder.

#### Additional options

The default settings will generate the complete edit log (i.e. the entire history). Sometimes, the site owner may just need the edit logs for the past month or so, or some custom time frame. In that case, provide the `--since` and `--until` options when running the script, with the date given in YYYY-MM-DD format:

```
node index.js --repo <repoName> --since <sinceDate> --until <untilDate>
```

If you need more guidance, feel free to use the help command:

```
node index.js --help
```

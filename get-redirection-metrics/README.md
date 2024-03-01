## Get redirection service metrics

This script allows you to get the adoption metrics of the [Isomer redirection service](https://github.com/opengovsg/isomer-redirection).

### Setup

This script queries the GitHub API, so you will need to set up your `GITHUB_TOKEN` to authenticate the API calls. To do that, ensure that the `GITHUB_TOKEN` environment variable is available inside your terminal session:

```
export GITHUB_TOKEN="<YOUR GITHUB TOKEN HERE>"
```

If you prefer, you can store this inside a `.env` file inside this directory, exporting the `GITHUB_TOKEN` inside, and then performing a `source .env`

### Generating the metrics

1. Ensure that you have your `GITHUB_TOKEN` exported into your terminal session.

2. Generate the redirection service metrics by running the following command:

```
node index.js
```

3. The metrics results will be printed onto the console, which will look something like this:

```
All domains known to be on redirection service: 583
Redirection domains correctly configured in the new way (i.e. 3 A records): 331
Redirection domains still configured in the old way (i.e. 1 A record): 227
Redirection domains with extra A records: 2
Redirection domains with extra AAAA records: 2
Domains that are completely wrong or decommissioned: 25
Percentage of domains correctly configured in the new way over all valid redirection domains: 59.32%
```

4. The list of domains for each metric is stored in the respective log files.

   1. `domains-on-new-redirection.log` - represents the list of redirection domains that are correctly configured using the new way (i.e. with 3 A records).

   2. `domains-on-old-redirection.log` - represents the list of redirection domains that are still using the old way of configuration (i.e. with 1 A record).

   3. `domains-with-extra-a-records.log` - represents the list of redirection domains that are configured to use the redirection service, but also contain extra A records.

   4. `domains-with-extra-aaaa-records.log` - represents the list of redirection domains that are configured to use the redirection service, but also contain extra AAAA records.

   5. `all-other-domains.log` - represents the list of redirection domains that are known to the redirection service, but are incorrectly configured entirely, or have been decommissioned.

5. If there are any errors, they will be printed to a `get-redirection-metrics-error.log` file.

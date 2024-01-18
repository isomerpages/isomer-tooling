## Get DNS indirection layer metrics

This script allows you to get the adoption metrics of the [DNS indirection layer](https://github.com/isomerpages/isomer-indirection).

### Setup

This script queries the GitHub API, so you will need to set up your `GITHUB_TOKEN` to authenticate the API calls. To do that, ensure that the `GITHUB_TOKEN` environment variable is available inside your terminal session:

```
export GITHUB_TOKEN="<YOUR GITHUB TOKEN HERE>"
```

If you prefer, you can store this inside a `.env` file inside this directory, exporting the `GITHUB_TOKEN` inside, and then performing a `source .env`

### Generating the metrics

1. Ensure that you have your `GITHUB_TOKEN` exported into your terminal session.

2. Generate the indirection layer metrics by running the following command:

```
node index.js
```

3. The metrics results will be printed onto the console, which will look something like this:

```
All domains known to be on indirection layer: 555
Domains correctly configured to be on indirection layer: 143
Domains not yet configured to be on indirection layer: 412
Percentage: 25.77%
```

4. The list of domains for each metric is stored in the respective log files.

   1. `github-indirection-domains.log` - represents the list of domains registered in the `isomer-indirection` repository. This is all domains that are known to be on the indirection layer.

   2. `live-domains-on-indirection.log` - represents the list of domains that have correctly configured their DNS to point to the DNS indirection layer.

   3. `domains-not-on-indirection.log` - represents the list of domains that have not yet configured their DNS to point to the DNS indirection layer.

5. If there are any errors, they will be printed to a `get-indirection-metrics-error.log` file.

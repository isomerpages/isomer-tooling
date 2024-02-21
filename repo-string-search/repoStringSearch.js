const { Octokit } = require('@octokit/rest');
const fs = require('fs');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const OUTPUT_FILE = "netlify_repos.txt"

const organization = 'isomerpages';

const devRepos = ["isomerpages/isomer-indirection", "isomerpages/isomer-tooling", "isomerpages/isomer-site-checker", "isomerpages/isomercms-frontend", "isomerpages/isomercms-backend", "isomerpages/site-creation-backend",]

const searchQuery = ".netlify.app"

async function searchReposForPatterns() {
  try {

    const nextPattern = /(?<=<)([\S]*)(?=>; rel="Next")/i;
    let pagesRemaining = true;
    let url = "/search/code"
    const res = []
    while (pagesRemaining) {  
      const resp = await octokit.request(`GET ${url}`, {
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        },
        q: `org:${organization}+${searchQuery}`,
        per_page: 100,
      })
      const matches = resp.data.items
      for (const match of matches) {
        if (devRepos.includes(match.repository.full_name) || match.path === "netlify.toml" || match.path === "_config.yml") continue
        res.push([match.repository.full_name, match.path])
      }
      const linkHeader = resp.headers.link;

      pagesRemaining = linkHeader && linkHeader.includes(`rel=\"next\"`);
      if (pagesRemaining) {
        url = linkHeader.match(nextPattern)[0];
      }
    }
    res.sort((a,b) => a[0].localeCompare(b[0]))
    let output = ""
    for (const item of res) {
      output += `${item[0].replace("isomerpages/", "")},${item[1]}\n`
    }
    fs.writeFileSync(OUTPUT_FILE, output)
  } catch (error) {
    console.error('Error:', error.message);
  }
}

searchReposForPatterns();

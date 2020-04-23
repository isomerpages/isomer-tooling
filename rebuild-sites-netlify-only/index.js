const axios = require('axios')
const Bluebird = require('bluebird')

const {
  NETLIFY_ACCESS_TOKEN,
} = process.env;


async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function rebuildAllNetlifySites() {
  let sitesList = []
  let pageCount = 1
  let hasNextPage = true;

  // 1. Obtain a list of Netlify site IDs for sites that belong to the isomer team
  while (hasNextPage) {
    try {
      // Get list of all repos within current page
      const resp = await axios.get(`https://api.netlify.com/api/v1/sites?access_token=${NETLIFY_ACCESS_TOKEN}&filter=all&page=${pageCount}`)
      hasNextPage = resp.headers.link.includes('next')
      resp.data.forEach(site => {
        // If site belongs to the isomer account, push it to the list of sites to rebuild
        if (site.account_name === 'isomer') {
          sitesList.push({siteId: site.site_id, siteName: site.name})
        }
      })

      console.log(`Obtained ${resp.data.length} sites in page ${pageCount}`)
      pageCount++
    } catch (err) {
      console.error(`An error occurred obtaining the list of Netlify site IDs ${siteId}: ${JSON.stringify(err)}`)
      throw err
    }
  }

  console.log(`Found ${sitesList.length} Netlify sites belonging to the Isomer account`)

  // 2. Trigger a rebuild for each site
  await Bluebird.each(sitesList, async ({siteId, siteName}) => {
    try {
      await axios.post(`https://api.netlify.com/api/v1/sites/${siteId}/builds?access_token=${NETLIFY_ACCESS_TOKEN}`)
      console.log(`Successfully triggered the rebuild for site ${siteName} with ID: ${siteId}`)

      // Sleep to prevent hitting API rate limits
      await sleep(1000)
    } catch (err) {
      console.error(`An error occurred during the rebuild for site ${siteName} with ID: ${JSON.stringify(err)}`)
    }
  })
}

rebuildAllNetlifySites()
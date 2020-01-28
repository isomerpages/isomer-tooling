const axios = require('axios');
const {
  KEYCDN_API_KEY, NETLIFY_ACCESS_TOKEN,
} = process.env;
const isomerObject = require('./isomer-sites.json')
const Bluebird = require('bluebird')

async function checkDeployState(NETLIFY_SITE_ID) {
  try {
    console.log('Checking if site has been deployed successfully for site ${NETLIFY_SITE_ID}');
    const resp = await axios.get(`https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/deploys?access_token=${NETLIFY_ACCESS_TOKEN}`);

    const latestDeployStatus = resp.data[0].state;
    if (latestDeployStatus === 'ready') {
      console.log(`Site ${NETLIFY_SITE_ID} has been successfully deployed`);
      return true;
    }
    console.log(`Site ${NETLIFY_SITE_ID} has not been deployed`);
    return false;
  } catch (err) {
    console.log(err);
    return false;
  }
}

async function purgeCache(KEYCDN_ZONE_ID) {
  try {
    console.log(`Purging cache for KeyCDN zone ${KEYCDN_ZONE_ID}`);
    const resp = await axios.get(`https://${KEYCDN_API_KEY}@api.keycdn.com/zones/purge/${KEYCDN_ZONE_ID}.json`);
    if (resp.status === 200) {
      console.log(`CDN cache has been successfully purged for KEYCDN Zone ID:${KEYCDN_ZONE_ID}`);
      return true;
    }
    console.log(`Failed to purge CDN cache for KEYCDN Zone ID:${KEYCDN_ZONE_ID}`);
    return false;
  } catch (err) {
    console.log(err);
    return false;
  }
}

async function purgeCacheIfDeployed(NETLIFY_SITE_ID, KEYCDN_ZONE_ID) {
  try {
    console.log(`In purgeCacheIfDeployed for ${NETLIFY_SITE_ID} and ${KEYCDN_ZONE_ID}`);
    let deploySuccess = false;

    while (!deploySuccess) {
      // eslint-disable-next-line no-await-in-loop
      deploySuccess = await checkDeployState(NETLIFY_SITE_ID);
    }

    let purgeSuccess = false;
    while (!purgeSuccess) {
      // eslint-disable-next-line no-await-in-loop
      purgeSuccess = await purgeCache(KEYCDN_ZONE_ID);
    }

  } catch (err) {
    console.log(err);
  }
}

async function rebuildSite(NETLIFY_SITE_ID, KEYCDN_ZONE_ID) {
  try {
    console.log(`Rebuilding site ${NETLIFY_SITE_ID} and CDN zone ${KEYCDN_ZONE_ID}`)

    // Get all the deploys for this site
    const resp = await axios.get(`https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/deploys?access_token=${NETLIFY_ACCESS_TOKEN}`)
    const LATEST_DEPLOY_ID = resp.data[0].id

    // Trigger rebuild of the latest deploy
    await axios.post(`https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/deploys/${LATEST_DEPLOY_ID}/restore?access_token=${NETLIFY_ACCESS_TOKEN}`)

    // Trigger cache purge if the rebuild (or any newer build) is deployed
    await purgeCacheIfDeployed(NETLIFY_SITE_ID, KEYCDN_ZONE_ID)

    console.log(`Rebuild process complete for Netlify Site ${NETLIFY_SITE_ID} with KeyCDN Zone ${KEYCDN_ZONE_ID}`)
  } catch (err) {
    console.log(err);
  }
}

async function rebuildAllSites() {
  try {
    console.log(typeof(isomerObject))
    await Bluebird.each(isomerObject.sites, isomerSite => {
      rebuildSite(isomerSite.netlify_site_id, isomerSite.keycdn_zone_id)
    })
  } catch (err) {
    console.log(err)
  }
}

function main() {
  rebuildAllSites()
}

main()
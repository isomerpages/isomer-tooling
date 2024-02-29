require("dotenv").config(); // Require and configure dotenv at the start
const https = require("https");
const querystring = require("querystring");

// Use environment variables for API key and monitor IDs
const apiKey = process.env.API_KEY;

// Use this only if you are reading from a .env file
const monitorIds = process.env.MONITOR_IDS.split(",");

// Function to update a monitor
// Note: Currently, this modifies a monitor to use GET instead of HEAD
// But this can be modified to use any parameters
function updateMonitor(monitorId) {
  const data = querystring.stringify({
    api_key: apiKey,
    format: "json",
    id: monitorId,
    http_method: 2, // '2' corresponds to GET
  });

  const options = {
    hostname: "api.uptimerobot.com",
    port: 443,
    path: "/v2/editMonitor",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": data.length,
      "Cache-Control": "no-cache",
    },
  };

  const req = https.request(options, (res) => {
    console.log(
      `Updating monitor ID ${monitorId}: statusCode: ${res.statusCode}`
    );
    res.on("data", (d) => {
      process.stdout.write(d);
    });
  });

  req.on("error", (error) => {
    console.error(`Error updating monitor ID ${monitorId}:`, error);
  });

  req.write(data);
  req.end();
}

// Call the function for each monitor ID
// monitorIds.forEach((monitorId) => {
//   updateMonitor(monitorId.trim());
// });

module.exports = updateMonitor;

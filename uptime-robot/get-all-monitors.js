require("dotenv").config();
const request = require("request");
const fs = require("fs");

/*
Monitor statuses - https://uptimerobot.com/api/#parameters
0 - paused
1 - not checked yet
2 - up
8 - seems down
9 - down
*/

const getAllMonitors = (status) => {
  return new Promise((resolve, reject) => {
    const options = {
      method: "POST",
      url: "https://api.uptimerobot.com/v2/getMonitors",
      headers: {
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded",
      },
      form: { api_key: process.env.API_KEY, format: "json", statuses: status },
    };
    request(options, function (error, response, body) {
      if (error) {
        reject(error);
      } else {
        resolve(body);
      }
    });
  });
};

getAllMonitors("8-9") // only if seems down, or is down
  // getAllMonitors() // all statuses
  .then((data) => {
    fs.writeFile("all-monitors.json", data, (err) => {
      if (err) {
        console.error("Error writing to file:", err);
      } else {
        console.log("Saved data to all-monitors.json");
      }
    });
  })
  .catch((error) => {
    console.error("Error:", error);
  });

module.exports = getAllMonitors;

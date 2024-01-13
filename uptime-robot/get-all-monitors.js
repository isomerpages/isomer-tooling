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

const getMonitorsPage = (statuses = "0-1-2-8-9", offset) => {
  return new Promise((resolve, reject) => {
    const options = {
      method: "POST",
      url: "https://api.uptimerobot.com/v2/getMonitors",
      headers: {
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded",
      },
      form: {
        api_key: process.env.API_KEY,
        format: "json",
        statuses,
        offset: offset,
        limit: 50,
      },
    };
    request(options, function (error, response, body) {
      if (error) {
        reject(error);
      } else {
        resolve(JSON.parse(body));
      }
    });
  });
};

const getAllMonitors = async (status) => {
  let allMonitors = [];
  let offset = 0;
  let total = null;

  do {
    try {
      console.log(`Getting offset: ${offset}, total: ${total}`);
      const response = await getMonitorsPage(status, offset);
      allMonitors = allMonitors.concat(response.monitors);
      total = response.pagination.total;
      offset += 50; // Adjust if necessary
    } catch (error) {
      console.error("Error:", error);
      break;
    }
  } while (offset < total);

  return allMonitors;
};

/*
 Use this code block if you just want to get the monitors
*/

// getAllMonitors("8-9") // only if seems down, or is down
// getAllMonitors() // all statuses
//   .then((monitors) => {
//     fs.writeFile(
//       "all-monitors.json",
//       JSON.stringify({ monitors: monitors }, null, 2),
//       (err) => {
//         if (err) {
//           console.error("Error writing to file:", err);
//         } else {
//           console.log("Saved data to all-monitors.json");
//         }
//       }
//     );
//   })
//   .catch((error) => {
//     console.error("Error:", error);
//   });

module.exports = getAllMonitors;

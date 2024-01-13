const getAllMonitors = require("./get-all-monitors");
const updateMonitor = require("./update-monitor");

// Get all monitors
getAllMonitors("8-9") // only if seems down, or is down
  // getAllMonitors() // all statuses
  .then((data) => {
    const monitors = JSON.parse(data).monitors;
    monitors.forEach((monitor) => {
      // console.log(monitor);
      updateMonitor(monitor.id);
    });
  })
  .catch((error) => {
    console.error("Error:", error);
  });

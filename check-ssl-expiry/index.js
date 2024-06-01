const https = require("https");

// List of domains to check
// const domains = ["example.com", "google.com", "facebook.com"];
const domains = ["google.com", "apple.com"];

// Checks if expiry of SSL expiry date is within one month
function checkSSLCertificate(domain) {
  const options = {
    hostname: domain,
    port: 443,
    method: "GET",
    rejectUnauthorized: false, // Necessary to prevent errors on self-signed certs
  };

  const req = https.request(options, (res) => {
    const cert = res.socket.getPeerCertificate();

    if (cert.valid_to) {
      const expiryDate = new Date(cert.valid_to);
      const currentDate = new Date();
      const oneMonthLater = new Date(
        currentDate.setMonth(currentDate.getMonth() + 1)
      );

      console.log(`Domain: ${domain}`);
      console.log(`Expiry Date: ${cert.valid_to}`);

      // Check if the expiry date is within one month from now
      if (expiryDate < oneMonthLater) {
        console.log("Warning: Certificate is expiring within one month.");
      } else {
        console.log("Certificate is valid for more than one month.");
      }

      console.log("-----------------------------");
    }
  });

  req.on("error", (e) => {
    console.error(`Error with domain ${domain}: ${e.message}`);
  });

  req.end();
}
// Iterate over each domain and check their SSL certificate
domains.forEach((domain) => {
  checkSSLCertificate(domain);
});

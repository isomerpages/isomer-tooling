const https = require("https");

// List of domains to check
const domains = ["example.com", "google.com", "facebook.com"];

// Function to check SSL certificate expiry date
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
      console.log(`Domain: ${domain}`);
      console.log(`Expiry Date: ${cert.valid_to}`);
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

import axios from "axios";
import { config } from "dotenv";
import dns from "node:dns";
import fs from "node:fs";

config();

const API_KEY = process.env.UPTIME_ROBOT_API_KEY;

interface Monitor {
  id: number;
  friendly_name: string;
  url: string;
  type: number;
  sub_type: number;
  status: number;
  ssl: {
    brand: string;
    product: string;
    expires: number;
  };
}

async function getMonitors(): Promise<Monitor[]> {
  const monitors: Monitor[] = [];
  let offset = 0;
  let paginationEndReached = false;
  let total = 0;
  do {
    const response = await axios.post(
      `https://api.uptimerobot.com/v2/getMonitors?api_key=${API_KEY}&format=json&logs=0`,
      { offset: offset }
    );

    monitors.push(...response.data.monitors);
    offset = monitors.length;
    total = response.data.pagination.total;
    paginationEndReached = total === monitors.length;
  } while (!paginationEndReached);
  console.log(`Got ${monitors.length} monitors`);

  //   throw new Error("test");
  return monitors;
}

async function getDomainsInCheck(): Promise<string[]> {
  const monitors = await getMonitors();
  console.log(monitors);
  //   const domainMonitors = monitors.filter(
  //     (monitor) => monitor.type === 1 && monitor.sub_type === 1
  //   );
  const domains = monitors.map((monitor) =>
    monitor.url
      // remove any protocol
      .replace(/^https?:\/\//, "")
      // remove any protocol
      .replace(/^http?:\/\//, "")
      // replace any trailing slash
      .replace(/\/$/, "")
      // replace any prefix www
      .replace(/^www\./, "")
  );
  console.log(domains);
  return domains;
}

async function getDomainIps(domain: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    dns.resolve(domain, (error, addresses) => {
      if (error) {
        reject(error);
      } else {
        resolve(addresses);
      }
    });
  });
}

async function hasAAAARecord(domain: string): Promise<boolean> {
  //   console.log(`Checking AAAA record for ${domain}`);
  return new Promise((resolve, reject) => {
    dns.resolve6(domain, (error, addresses) => {
      if (error) {
        reject(error);
      } else {
        // console.log(`AAAA record for ${domain}: ${addresses}`);
        if (addresses[0].includes("Error: queryAaaa ENODATA")) {
          resolve(false);
        }
        resolve(true);
      }
    });
  });
}

async function hasCNAMERecord(domain: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    dns.resolveCname(domain, (error, addresses) => {
      if (error) {
        resolve(false);
      } else {
        // console.log(`CNAME record for ${domain}: ${addresses}`);
        if (addresses[0].includes("Error: queryCname ENODATA")) {
          resolve(false);
        }
        resolve(true);
      }
    });
  });
}

async function hasGreaterThanOneARecord(domain: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    dns.resolve4(domain, (error, addresses) => {
      if (error) {
        resolve(false);
      } else {
        // console.log(`A record for ${domain}: ${addresses}`);
        if (addresses.length > 1) {
          resolve(true);
        }
        resolve(false);
      }
    });
  });
}

async function getDomainsWithAAAARecord(domains: string[]): Promise<string[]> {
  const domainsWithAAAARecord: string[] = [];
  for (const domain of domains) {
    try {
      const hasAAAA = await hasAAAARecord(domain);
      if (hasAAAA && !(await hasCNAMERecord(domain))) {
        // console.log(`Domain ${domain} has AAAA record`);

        domainsWithAAAARecord.push(domain);
      }
    } catch (error) {
      console.error(`Error checking AAAA record for ${domain}: ${error}`);
    }
  }
  return domainsWithAAAARecord;
}

async function getDomainsWithMoreThanOneARecord(
  domains: string[]
): Promise<string[]> {
  const domainsWithOneARecord: string[] = [];
  for (const domain of domains) {
    try {
      const hasGrTnOneA = await hasGreaterThanOneARecord(domain);
      if (hasGrTnOneA && !(await hasCNAMERecord(domain))) {
        domainsWithOneARecord.push(domain);
      }
    } catch (error) {
      console.error(`Error checking A record for ${domain}: ${error}`);
    }
  }
  return domainsWithOneARecord;
}

async function main() {
  const domainsInCheck = await getDomainsInCheck();
  const domainsWithAAAARecord = await getDomainsWithAAAARecord(domainsInCheck);
  const domainsWithGtrTnOneARecord = await getDomainsWithMoreThanOneARecord(
    domainsInCheck
  );

  console.log("Domains with AAAA record:", domainsWithAAAARecord);
  console.log("Domains with > 1 one A record:", domainsWithGtrTnOneARecord);
  // persist this in a logs.txt file
  fs.writeFileSync(
    "logs.txt",
    `Domains with AAAA record: ${domainsWithAAAARecord}\nDomains with > 1 one A record: ${domainsWithGtrTnOneARecord}`
  );
}

main();

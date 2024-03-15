# rebuild-sites-amplify

Rebuilds all available amplify sites.

# Overview

The script in `index.js` calls the Amplify API to rebuild all repos in Amplify for our AWS org.

The `change-redirs.js` script instead is used to add a new redirect rule to all sites - it does not rebuild the sites. Note that this script is set to append the following redirect rules:

```
  source: "</%5C/>",
  target: "/404.html",
  status: 302
```

and

```
  source: "</%5c/>",
  target: "/404.html",
  status: 302
```

The code should be modified to as necessary to add in another redirect rule instead.

### How to run

The script is run on your local machine.

First, update the .env file in the main directory with the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables.

Then run the following command as appropriate:

```
# pwd rebuild-sites-amplify

source .env
npm install
node <index.js | change-redirs.js>
```

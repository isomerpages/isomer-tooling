# Introduction

This folder contains a scripts to retrieve build sizes of all amplify repos.

# Overview

The script in `index.js` calls the Github API to retrieve all repos with their associated sizes, sorted in descending order.

### How to run

The script is run on your local machine.

First, update the .env file in the main directory with the `GITHUB_TOKEN`.

Then run the following commands:

```
source .env
npm install
node index.js
```

This should output a sorted list of repos in `repos.txt`. Amplify will not be able to handle sites which are larger than 5GB - we should consider a custom anything close to 5000000 should be moved to a custom deploy. Note that there is a little buffer, as the build files are overall smaller than the repo files due to unnecessary files being removed.

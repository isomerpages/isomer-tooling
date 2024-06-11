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

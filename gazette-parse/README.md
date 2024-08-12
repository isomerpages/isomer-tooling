# Introduction

This folder contains scripts to help with the uploading of egazettes, in the case of any issues faced.

# Overview

There are 2 scripts which can be called - running `npm run uploadS3` uploads the desired file to the production s3 bucket, while `npm run uploadAlgolia` parses the desired file and populates algolia with the appropriate records.

### How to run

The script is run on your local machine.

First, update the .env file - see the .env.example file and 1password to retrieve relevant env vars.

The `metadata.csv` file also needs to be populated - an example entry is already provided.

Finally, run `npm run uploadS3` or `npm run uploadAlgolia` as appropriate.

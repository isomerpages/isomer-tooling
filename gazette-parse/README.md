# Introduction

This folder contains scripts to help with the uploading of egazettes, in the case of any issues faced.

# Overview

There are 3 scripts which can be called - running `npm run uploadS3` uploads the desired file to the production s3 bucket, while `npm run uploadAlgolia` parses the desired file and populates algolia with the appropriate records. `npm run uploadAlgolia` additionally takes in 2 optional arguments - add `noUpload` to test the parsing without uploading the result to algolia, and add `image` to use ocr to parse text instead. `npm run deleteAlgoliaRecords <objectId> <number of entries>` will remove the target records from algolia.

### How to run

The script is run on your local machine.

First, update the .env file - see the .env.example file and 1password to retrieve relevant env vars.

The `metadata.csv` file also needs to be populated - an example entry is already provided.

Finally, run `npm run uploadS3`, `npm run uploadAlgolia` or `npm run deleteAlgoliaRecords <objectId> <number of entries>` as appropriate.

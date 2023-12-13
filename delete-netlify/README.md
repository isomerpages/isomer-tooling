# Introduction

This script is meant to be invoked from the command line to delete sites listed in `sites.txt`

# Pre-requisites

Add your own `NETLIFY_ACCESS_TOKEN` inside `index.js`; **DO NOT** commit the token into the repository otherwise bad things will happen

# Running the script

Use `node index.js > output.txt` to run the script and to pipe your output to a `output.txt` file.

afterwards, check the output file to ensure that all sites in `sites.txt` have been deleted.

go to netlify and check the audit log afterwards to double-confirm.

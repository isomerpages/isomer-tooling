# Introduction

This folder contains two scripts to rebuild amplify - first, a bash script; secondly, a ts script.

# Pre-requisites

In order to use the bash script, your AWS CLI must be setup. Follow the instructions on AWS CLI docs to set it up if not.

# Running the script

First, go into `rebuild.sh`. Then, update the `branch_name` to your desired branch. Thereafter, run `bash rebuild.sh > output.txt` to pipe your output to the text file.

# Clean-up

Check build failures on datadog's dashboard and the `output.txt` to see if there are any unexpected failures.

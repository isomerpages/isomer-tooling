#!/bin/bash

branch_name="master"

# List all apps and get app IDs
app_ids=$(aws amplify list-apps | jq -r '.apps[].appId')

# Loop through each app ID
for app_id in $app_ids; do
    echo "Processing app ID: $app_id"

    # Check if the branch exists
    if aws amplify get-branch --app-id $app_id --branch-name $branch_name 2>/dev/null; then
        # Get the latest succeeded job ID for the branch
        latest_succeeded_job_id=$(
            aws amplify list-jobs --app-id $app_id --branch-name $branch_name --query "jobSummaries[?status=='SUCCEED'] | [0].jobId" --output text | head -n 1
        )

        # Check if a job ID was found
        if [ -n "$latest_succeeded_job_id" ] && [ "$latest_succeeded_job_id" != "null" ]; then
            echo "Retrying the latest successful job ID: $latest_succeeded_job_id for app ID: $app_id"
            # Retry the latest successful job
            aws amplify start-job --app-id $app_id --branch-name $branch_name --job-id $latest_succeeded_job_id --job-type RETRY
        else
            echo "No successful jobs found for app ID: $app_id"
        fi
    else
        echo "Branch $branch_name does not exist for app ID: $app_id"
    fi

    echo "Done processing app ID: $app_id \n"
done

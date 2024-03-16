#!/bin/bash

# README: 
# Update the branch_name and specified_date_time to filter the failed builds from that date/time

# Disable the pager for AWS CLI output
export AWS_PAGER=""

branch_name="staging-lite"
specified_date_time="2024-01-09T00:00:00" # Modify this to your required date-time

# Create or clear the log file
> failed-$branch_name.log

# List all apps and get app IDs
app_ids=$(aws amplify list-apps | jq -r '.apps[].appId')

# Loop through each app ID
for app_id in $app_ids; do
    # Check if the branch exists
    if aws amplify get-branch --app-id $app_id --branch-name $branch_name 2>/dev/null; then
        # Get the latest job ID for the branch after the specified date-time
        latest_job_id=$(
            aws amplify list-jobs --app-id $app_id --branch-name $branch_name \
            --query "jobSummaries[?endTime>='$specified_date_time'] | [0].jobId" --output text | head -n 1
        )

        # Check if a valid job ID was found
        if [ -n "$latest_job_id" ] && [ "$latest_job_id" != "null" ] && [ "$latest_job_id" != "None" ]; then
            latest_job_status=$(
                aws amplify get-job --app-id $app_id --branch-name $branch_name --job-id $latest_job_id \
                --query "job.summary.status" --output text
            )

            # Check if the latest job is a failed job
            if [ "$latest_job_status" = "FAILED" ]; then
                echo "Logging failed job for app ID: $app_id" # Minimal output for logging action
                echo "Latest job ID: $latest_job_id for app ID: $app_id failed after $specified_date_time" >> failed-$branch_name.log
            fi
        fi
    fi
done

echo "Failed build logs are recorded in failed-$branch_name.log"

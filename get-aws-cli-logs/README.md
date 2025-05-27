# Script to get Amplify logs

Contains some dynamic params to halve the interval if the get logs command fails and retries. Else, it increases the interval up till a specified max.

Update the amplify app id - domain names to fetch.

Update the start and end time.

Update the IP to search for in the logs (if required)

Requires local AWS profile/CLI to work.
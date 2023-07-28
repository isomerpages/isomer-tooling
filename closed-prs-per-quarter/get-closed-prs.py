from datetime import datetime, timedelta
from github import Github
import os
# Replace with your personal access token
ACCESS_TOKEN = os.environ.get('GITHUB_TOKEN_REPO_ACCESS')
if ACCESS_TOKEN is None:
    print("Please set the GITHUB_TOKEN_REPO_ACCESS environment variable")
    exit(1)
# Replace with the name of the organization you want to search
ORG_NAME = "ISOMERPAGES"

# Authenticate with Github using your personal access token
g = Github(ACCESS_TOKEN)

# Get the organization object
org = g.get_organization(ORG_NAME)

# Get the current date and the date 3 months ago
today = datetime.now()
three_months_ago = today - timedelta(days=90)

# Initialize a counter for the total number of closed pull requests
total_closed_prs = 0
non_agency_repos = [
    "isomerpages-template",
    "isomercms-frontend",
    "isomercms-backend",
    "isomer-infra",
    "isomer-tooling",
    "site-creation-backend",
    "isomer-redirection"
]

num_of_repos = 0

# Paginate through all the repositories in the organization
for repo in org.get_repos():
    if repo.name in non_agency_repos:
        print(f'Skipping repo {repo.name}')
        continue
    # check if repo name contains the word 'test'
    if 'test' in repo.name:
        print(f'Skipping repo {repo.name}')
        continue
    num_of_repos += 1
    # Get all the closed pull requests for the past 3 months
    closed_prs = repo.get_pulls(
        state='closed', sort='updated', direction='desc', base='master')
    # Loop through each closed pull request
    for pr in closed_prs:
        # Check if the pull request was closed within the past 3 months
        if pr.closed_at and pr.closed_at >= three_months_ago:
            # If so, increment the total counter
            total_closed_prs += 1
            if total_closed_prs % 100 == 0:
                # printing out every 100th pr closed in case script crashes
                print(
                    f'Pull request number #{total_closed_prs} was closed on {pr.closed_at}')


# Print the total number of closed pull requests for the past 3 months
print(f'Total closed pull requests for the past 3 months: {total_closed_prs}')
print(f'Total number of repos: {num_of_repos}')
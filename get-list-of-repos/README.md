# Domain List

This script is to get a list of live domains that Isomer has.

Steps to get the updated list:

0. Create a `.env` file and copy over contents from .env-example over + obtain the secret api key directly from 'https://app.keycdn.com/users/authSettings'
1. Go into the db instance in the reader mode (typically done via tableplus)
2. Enter the query `select "primary_domain_source" from launches`
3. Export the results that are displayed in a CSV format
4. Copy paste over the content to db-launches-table.csv
5. Run `npm get-domains`
6. Updated list should be at the `Updated__List_of_Domains.csv`

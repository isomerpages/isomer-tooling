## Check users against whitelist

This script helps to generate a SQL query to run against our prod db to check that all users are expected.

1. Export the email field of the `whitelist` table into the file `whitelist_emails.csv`
2. Run the script using

```
python3 check_whitelist.py
```

3. Copy the result to use as an SQL query

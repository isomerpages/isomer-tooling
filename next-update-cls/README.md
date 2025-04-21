## Update CSA CLS items

This script automatically updates the CLS collection for the CSA website on Studio.

### Setup

This script requires a connection to the Studio production database. Duplicate the `.env.example` file into `.env` and update the values accordingly:

- `DATABASE_URL`: This is the database connection string to the Studio database (but should be localhost since we are using port forwarding).
- `PUBLISHER_USER_ID`: This is the user ID of the user to assign as the publisher of all pages. You can use your own user ID stored inside the production DB User table.

Additionally, you need to set up your SSH keys and `.env.prod` files inside the `.ssh` folder:

1. Create a `.ssh` folder inside this folder.
2. Create a `.env.prod` (for production) with the following environment variables:
   1. `SSH_HOST`: This is the IP address or domain name of the bastion host to jump through to access the database.
   2. `SSH_USER`: This is the user to use when connecting to the bastion host.
   3. `DB_HOST`: This is the full hostname of the RDS database server, which should be the writer endpoint of the RDS cluster.
3. Add the SSH private key as `isomer-next-prod-bastion.pem` inside this `.ssh` folder.

Once everything is set up, verify that you are able to connect to the bastion host by connecting to the OGP VPN, then running `npm run jump:prod`. If successful, you should be able to see a shell session started on the bastion host.

### Running the script

As you will be modifying the production database, make sure to **follow these steps very carefully**.

1. Connect to the OGP VPN.
2. Create a new SSH tunnel to the RDS database by running `npm run jump:prod`.
3. Log in to AWS via SSO using `aws sso login`.
4. Prepare the materials required by the script:
   1. Download the live CLS items spreadsheet as CSV and save it as `cls-active-items.csv` in the same directory as the script.
   2. Download the archived CLS items spreadsheet as CSV and save it as `cls-archived-items.csv` in the same directory as the script.
5. Start running the script by creating a separate terminal window and running `npm run start`.
6. Items that should be archived will be moved into the archived collection.
7. Halfway through, the script will prompt you to download the product and label images. Follow these steps:
   1. Create two new folders in this same directory called `product` and `label`.
   2. Download the new product images required by the script from the Google Drive link shared with CSA and save them inside this new `product` folder.
   3. Download the new label images required by the script from the Google Drive link shared with cSA and save them inside this new `label` folder.
   4. Press enter to confirm that the images have been placed in the folders correctly.
8. The script will continue running to upload the images to the S3 bucket (this will use the `isomer-production` AWS profile automatically, adjust the configuration variable at the top of the index.js file if you use a different name), and then subsequently create the new CLS items.
9. At the end, the script will generate a new file called `cls-redirection-mappings.csv`. Add the contents of this file into the list of redirects inside our `isomer-next-infra` repo, then perform a `pulumi up`.
10. Verify that the new items have been created successfully on the production Isomer Studio.
11. Trigger a new CodeBuild to publish the changes made.

import csv

csv_file_path = 'whitelist_emails.csv'

with open(csv_file_path, 'r') as file:
    csv_reader = csv.reader(file)
    
    print(f'SELECT * FROM "users" WHERE')
    # First row is "email"
    is_title = True
    is_first_item = True
    for row in csv_reader:
        if (is_title):
          is_title = False
          continue
        email = row[0]
        if (is_first_item):
          if (email[0] == "@" or email[0] == '.'):
            print(f"email NOT LIKE '%{email}'")
          # Output the email in the desired format
          else:
            print(f"email <> '{email}'")
          is_first_item = False
          continue
        if (email[0] == "@" or email[0] == '.'):
          print(f"AND email NOT LIKE '%{email}'")
        # Output the email in the desired format
        else:
          print(f"AND email <> '{email}'")
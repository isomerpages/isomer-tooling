#!/bin/bash

# Check if the input CSV file is provided as an argument
if [ -z "$1" ]; then
	echo "Usage: $0 <input_csv_file>"
	exit 1
fi

input_file="$1"

# Read the CSV file line by line
while IFS=, read -r domain; do
	# Check if the line is not empty
	# Perform the dig command and extract the status
	dig_status=$(dig "$domain" | grep "status")
	if [[ "$dig_status" == *"SERVFAIL"* ]]; then
		echo "$domain: $dig_status"
	fi
done <"$input_file"

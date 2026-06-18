## Isomer Next automated migration scripts

This is a set of scripts used to automate the migration of HTML content into a legal Isomer Schema.

### Preparing the script

There are two main files that you may need to adjust for the automation, namely:

1. `convert-tiptap.js` - this is the main file that contains the logic for converting HTML into the Isomer Schema. You generally do not need to modify this file, unless:
   1. You need to be able to automatically download all images and files from the existing site that you are migrating from. In that case, adjust the `SITE_BASE_URL`, `IMAGES_PATH_PREFIX` and `FILES_PATH_PREFIX` configuration settings at the top of the file.
      1. NOTE: The script assumes that all links to files have `href` that starts with "/docs". If it is otherwise, you may need to change the `isFileLink` function logic.
   1. You need to create a complex Isomer component directly from the HTML structure. In that case, you may need to define your own custom Tiptap nodes and add the logic to detect the HTML. You can follow the commented out examples on how the Contentpic and Infobar components are created.
1. `from-content-csv.js` - this is the main entry point for your automation script. This mainly extracts out the information from the input CSV file that you supply to the script at `input.csv`.
   1. You will almost always need to adjust this to get minimally the `fileName` (which will be the permalink of the page) and the `html`. For dates, make sure that you read them correctly and the output format should be `DD/MM/YYYY`.
   1. You will also need to adjust this file you wish to change the format of the Isomer Schema output (e.g. adding disclaimer callout, etc). The output of the `html` is stored inside `contentItems` as an array, which you can directly put into the `content` key.

### Running the script

Once the preparation work is done, you can proceed to execute the automation script:

1. Run with the following command: `node from-content-csv.js | tee fileMappings.txt`
   1. This will output a number of things inside your console, and also save the console output into the `fileMappings.txt` file.
   1. Check through this output file to find for pages that may have issues. Try searching for terms like `Image alt text is too long` to ensure that you resolve those issues first, then remove those lines from the file.
1. If you have images and files that were downloaded using the script, then run `node get-file-mappings.js` to convert the file mappings into a format suitable for creating redirections, and the output will be saved in `file-mappings.csv`.
1. The JSON files will be stored inside `output` and download files will be inside `downloads` (inside `files` and `images` respectively).

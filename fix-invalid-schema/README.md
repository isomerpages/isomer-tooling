# Fix Invalid Invalid Schema

## Problem

Table headers may contain content that is not properly wrapped in paragraph nodes, such as:
- Unordered lists directly under table headers
- Paragraphs with only hard breaks

Heading should not be 1 as it's reserved for the document title.

Prose components should not be empty.

Image should not have empty `src` properties

## Solution

The script:
1. Recursively traverses the JSON structure
2. Identifies table header nodes
3. Checks for non-paragraph content
4. Wraps or fixes invalid content:
   - Table headers: Extracts text from unordered lists + Removes empty hard break paragraphs + Throws error for other invalid types
   - Heading: Update heading to 2
   - Prose component: Removes component
   - Image: Set `src` to empty string

## Usage

1. Ensure the JSON file is in the same directory as the script.
2. Update the `FILE_PATH` variable to point to the JSON file you want to fix.
3. Run the script using Node.js:
   ```bash
   node index.js
   ```

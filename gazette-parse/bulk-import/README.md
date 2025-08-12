# Gazette Bulk Import Tool

A tool for bulk importing government gazettes with OCR processing and metadata extraction.

## Prerequisites

1. **Node.js dependencies**: `npm install`
2. **System dependencies for OCR** (install via Homebrew): `imagemagick`, `ghostscript` and `poppler`

## Data Requirements

### From MCI

1. **Metadata CSV** - Contains published date, category, and other metadata
2. **Gazette PDFs** - Typically provided on a thumb drive
   - Arrange collection: MCI usually delivers to office or via on-demand delivery service

### CSV File Validation

Before processing, verify the CSV file:

1. **Unique filenames**: Ensure no duplicate filenames exist for the same year and category combination
   - Filenames are used as object keys for AWS and Algolia
   - Duplicate keys will cause overwrites
2. **Category mapping**: Verify categories/subcategories are correctly mapped
   - Example: `Cap20` should map to `Notices (Bankruptcy Act)`
   - When uncertain, consult with MCI

## Configuration

### Environment Setup

1. **`.env` file**: Configure required environment variables as specified in `index.ts`
   - Retrieve credentials from 1Password or directly from Algolia/AWS

### File Paths

Update the following in `index.ts`:

1. **`CSV_FILE_PATH`** - Path to the metadata CSV file
2. **`CSV_FILE_ROOT_FOLDER`** - Directory containing the CSV file
3. **`GAZETTE_ROOT_FOLDER`** - Directory containing the gazette PDFs
4. **`BASE_STORAGE_URL`** - Update to staging URL if testing on staging

### Mapping Configuration

In `mapping.ts`, ensure:

1. All categories and subcategories are covered
2. Filename is added to `csvFileMapping`
3. `metadataColumnMapping` is updated based on the received CSV structure

## Testing Strategy

### Staging Environment

**Always test on staging first** to ensure the script works as intended.

### Incremental Testing

Recommended approach for debugging:

1. Comment out code after `parseFileMetadata`
2. Run the script to verify parsing works correctly
3. Gradually uncomment and test subsequent steps
4. This approach helps identify issues like:
   - Filename mismatches between CSV and actual files
   - CSV encoding issues (mojibake)
   - Other unexpected data inconsistencies

## Performance Considerations

### Processing Time

- **Slow processing**: OCR is performed locally
- **Estimated time**: 100 records can take over 1 hour
- **No downtime impact**: Import process doesn't affect live services
- **Scheduling flexibility**: Can be run during business hours if needed

## Verification

Verify the import was successful by checking record counts before and after.

### Staging Environment

Use Algolia admin portal with filters to verify results.

### Production Environment

Algolia admin portal limits results to 1000 records. Use this bash command for complete counts:

```bash
curl -s -X POST \
  -H "X-Algolia-API-Key: ALGOLIA-CLIENT-KEY" \
  -H "X-Algolia-Application-Id: ALGOLIA-APPLICATION-ID" \
  -H "Content-Type: application/json" \
  "https://ALGOLIA-APPLICATION-ID-dsn.algolia.net/1/indexes/*/queries" \
  --data '{"requests":[{"indexName":"ALGOLIA-INDEX","params":"facetFilters=[[\"category:Government Gazette\"],[\"subCategory:Others\"]]&numericFilters=[\"publishYear>=2000\",\"publishYear<=2000\"]&hitsPerPage=0"}]}' \
  | jq '.results[0].nbHits'
```

**Configuration values to replace:**
- `ALGOLIA-CLIENT-KEY`
- `ALGOLIA-APPLICATION-ID`
- `ALGOLIA-INDEX`
- Year, category, and subcategory filters

**Note**: These values are not sensitive and can be retrieved from the Algolia admin portal or network tab of egazette.gov.sg

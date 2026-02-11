# R-U-Certified JSON Validator

A validation tool developed by Ting Shian to assess whether participants who attended Isomer training have successfully met the assignment requirements.

The tool evaluates submitted JSON files against predefined criteria and automatically generates a CSV report summarising the validation outcomes.

---

## 📁 Project Structure

```bash
r-u-certified/
│
├── marking.py                # Main validation script
├── assignment-submission/    # Folder for JSON submissions
├── test-examples/            # Example JSON files (pass / fail samples)
├── reports/                  # Auto-generated CSV reports (created at runtime)
└── .git/                     # Git metadata
```

---

## 🚀 Features

The validator checks the following requirements:

### 1️⃣ Page-Level Validation

* Page title extraction
* Summary must not be empty
* Summary must not use default placeholder text

### 2️⃣ Content-Level Validation

* Content array must not be empty

### 3️⃣ Headings

* First heading must be **Level 2**
* Heading hierarchy cannot skip levels

### 4️⃣ Prose Blocks

* Minimum **2 prose blocks** required
* At least one prose block must contain:

  * An unordered list
  * An ordered list

### 5️⃣ Nested Lists

* Unordered lists must contain nested sub-lists
* Ordered lists must contain nested sub-lists

### 6️⃣ Tables

* At least one table required
* Each table must:

  * Have a non-empty caption
  * Not use default caption text
  * Include table headers (`tableHeader`)
  * Include table cells (`tableCell`)

### 7️⃣ Accordions

* Exactly **2 accordions** required
* Each accordion must have a non-empty summary

### 8️⃣ Images

* At least one image required
* Image must:

  * Have non-empty alt text
  * Not use placeholder alt text
  * Not use placeholder image source

### 9️⃣ Infocards Component

* Infocards component must exist
* Each card must contain:

  * Title
  * Image alt text
  * Image URL

---

## 🛠 Requirements

* Python 3.8+
* No external dependencies (standard library only)

Modules used:

* `json`
* `os`
* `sys`
* `csv`
* `pathlib`
* `datetime`

---

## ▶️ How to Use

### Exporting Files from Isomer Studio (Sandbox)

To validate assignment submissions:
<ol>
 <li>An engineer must export the page JSON files from the Isomer Studio Sandbox environment.</li>
 <li>Create an empty assignment-submission folder
 <li>Place the exported JSON files into the assignment-submission/ folder.</li>
 <li>Run the validation script against that folder.</li>
</ol>

This ensures that the submitted files are evaluated using the same structured validation criteria.

### Validate JSON files in a folder

```bash
python marking.py assignment-submission
```

---

## 📊 Output

### Console Output

The script prints:

* PASS / FAIL per file
* Detailed validation errors
* Summary statistics

Example:

```bash
Found 3 JSON file(s) to validate

❌ FAIL: example.json
    - First heading must be level 2
    - Missing infocards component

SUMMARY:
  Total files: 3
  ✅ Passed: 1
  ❌ Failed: 2
```

---

### CSV Report

After validation, a CSV report is automatically generated in the `reports/` folder.

Filename format:

```bash
<foldername>_report_YYYYMMDD_HHMMSS.csv
```

CSV Structure:

| Name       | Status      | Errors            |
| ---------- | ----------- | ----------------- |
| Page Title | PASS / FAIL | First error       |
|            |             | Additional errors |

---

## 🧪 Test Examples

Located in:

```bash
test-examples/
```

Includes:

* `perfect-example.json`
* `half-complete-example.json`
* `fail-example.json`

You can use these files to test how the validator behaves under different scenarios.

---

## 🏗 Architecture Overview

### Core Validation Flow

1. Load JSON file
2. Validate page-level fields
3. Validate content structure
4. Run component-specific validators
5. Collect errors
6. Generate summary + CSV report

### Key Functions

* `validate_page_json()` — Runs full validation pipeline
* `validate_multiple_files()` — Handles directory validation
* `generate_csv_report()` — Creates structured CSV output
* `find_content_items()` — Recursive utility for locating content types

---

## 🎯 Intended Use Cases

* Assignment marking automation
* Structured content validation
* JSON schema compliance checking
* Batch validation for content migration workflows

---

## 📬 Extending the Validator

To add new validation rules:

1. Create a new validation function
2. Append its errors inside `validate_page_json()`
3. Ensure error messages are clear and actionable

---

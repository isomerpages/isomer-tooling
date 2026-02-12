# 📝 TS Marking Script (R-U-Certified)

A Python-based JSON validation tool used to assess Isomer training assignment submissions.

The script validates structured page JSON files against predefined rules and generates a CSV report summarising results.

---

## 🚀 Features

* Validates JSON assignment submissions
* Displays PASS / FAIL results in console
* Generates timestamped CSV report
* Uses only Python standard library (no external dependencies)

---

## 📦 Project Structure

```bash
json-assignment-validator/
├── marking.py
├── assignment-submission/
├── test-examples/
└── reports/
```

* `marking.py` — Main validation script
* `assignment-submission/` — Folder containing student JSON files
* `test-examples/` — Sample JSON files (pass/fail examples)
* `reports/` — Auto-generated CSV reports

---

## 🧰 Requirements

* Python 3.8+
* Visual Studio Code (recommended)

Verify Python installation:

```bash
python3 --version
```

---

## 📁 Setup

### 1️⃣ Clone the Repository

Using GitHub Desktop or Git:

```bash
git clone <repository-url>
```

Open the project folder in VS Code.

---

### 2️⃣ Create Submission Folder

Inside the project directory, ensure this folder exists:

```bash
assignment-submission/
```

---

### 3️⃣ Add Student Submissions

* Export student JSON files from **Isomer Studio Sandbox**.
* Place the exported `.json` files inside `assignment-submission/`.

---

## ▶️ Running the Script

Open the VS Code terminal and run:

```bash
python3 marking.py assignment-submission
```

If `python3` does not work, try:

```bash
python marking.py assignment-submission
```

---

## 📊 Output

### Console Output

Example:

```bash
✅ PASS: student1.json (Title: My Page)
❌ FAIL: student2.json (Title: Home Page)
 - Summary cannot be the default text 'This is the page summary'
 - Missing ordered list
```

Summary:

```bash
Total files: 3
Passed: 1
Failed: 2
```

---

### 📄 CSV Report

A timestamped CSV file is generated in the `reports/` folder:

```
reports/<foldername>_report_YYYYMMDD_HHMMSS.csv
```

Columns:

| Name | Status | Errors |
| ---- | ------ | ------ |

* **Name** → Extracted from page title
* **Status** → PASS or FAIL
* **Errors** → Listed per validation failure

---

## ✅ Validation Rules

The script checks:

### Page Summary

* Cannot be empty
* Cannot be "This is the page summary"

### Content Structure

* At least 2 prose blocks
* One unordered list
* One ordered list
* Nested sub-lists required

### Headings

* First heading must be level 2
* Cannot skip heading levels

### Tables

* Minimum 1 table
* Caption required (not default text)
* Must contain headers and cells

### Accordions

* Exactly 2 required
* Each must have a summary

### Images

* Minimum 1 image
* Alt text required
* No placeholder alt text
* No placeholder image source

### Infocards

* Component must exist
* Each card must have title, image alt text, and image URL

---

## 🆘 Troubleshooting

* Ensure all files end with `.json`
* Read error messages carefully — they indicate what needs fixing
* Verify Python is installed correctly

---


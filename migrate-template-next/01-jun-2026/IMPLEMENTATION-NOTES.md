# TOSP JSON Generator — Implementation Notes

Two implementation plans were executed in sequence on `tosp.py`. Both are reflected in the current code.

---

## Plan 1 — Drive JSON generation from `test-fee-benchmarks-surgeon.csv`

### Context

`test-fee-benchmarks-surgeon.csv` was added as the **sole authority** for which TOSP pages get generated and how each page is shaped, via its `For OGP's Action (Remove/Retain Hospital Bill Size)` column. Three branches per OGP action:

- **REMOVE** → both Hospital Bill accordions render the "No record found." placeholder; MOH Recommended Fees populated as normal.
- **RETAIN** → previous behavior: Hospital Bill accordions populated from `fee-publication-data-tosp.csv`, `fee-publication-data-tosp-hospital-level.csv`, and `fee-benchmarks-hospital.csv`.
- **Create new page** → Hospital Bill accordions get the placeholder; MOH Recommended Fees uses surgeon/anaesthetist bounds from the test CSV; `hosp_fees = None` so utils.py renders the Hospital Fees row as "Not Available".

The page layout/template (`version`, `page`, `layout`, accordion summaries, explanatory notes block) was preserved unchanged.

### Changes in `tosp.py`

1. **`TOSP_FEE_BENCHMARKS_SURGEON_CSV`** at [tosp.py:14](tosp.py#L14) → `"test-fee-benchmarks-surgeon.csv"`.
2. **`NO_RECORD_PARAGRAPH` constant** at [tosp.py:31-37](tosp.py#L31-L37):
   ```python
   NO_RECORD_PARAGRAPH = {
     "type": "paragraph",
     "content": [
       {"type": "text", "marks": [{"type": "italic"}], "text": "No record found."},
       {"type": "text", "marks": [], "text": " Contact your healthcare provider if you have questions on your hospital bill."}
     ]
   }
   ```
3. **`create_tosp_page` signature** extended to accept `ogp_action` (last arg).
4. **OGP action normalization** at [tosp.py:96-99](tosp.py#L96-L99):
   ```python
   action = str(ogp_action).strip().upper()
   is_remove = action == "REMOVE"
   is_create_new = action == "CREATE NEW PAGE"
   hide_hospital_bill = is_remove or is_create_new
   ```
5. **Hospital Bill (Overall)** and **Hospital Bill (by Hospital)** branches: when `hide_hospital_bill` is true, append the accordion with `details.content = [NO_RECORD_PARAGRAPH]` instead of calling `get_hospital_bill_overall` / `get_hospital_bill_by_hospital`.
6. **MOH Recommended Fees fees**: removed broken `int(...)` conversions. `utils.get_fees_with_gst` ([utils.py:18](utils.py#L18)) expects **strings**, so bounds are passed as strings. Missing values (`'-'`, `''`, `'Removed'`) make the whole fees dict `None`. For `is_create_new`, `hosp_fees` is forced to `None` so the Hospital Fees row renders as "Not Available" via [utils.py:7-16](utils.py#L7-L16).
7. **Removed** the buggy `if tosp_code in surg_ann_records[0]["For OGP's Action ..."]` substring check.
8. **Re-enabled** the JSON file write at the end of `create_tosp_page` (was commented out).
9. **`main()` rewrite**: TOSP-code universe is built **only** from the test CSV via a `surg_lookup` dict keyed by `Current TOSP code`. Codes only present in the bill CSVs are skipped. `blacklistTOSP` still applies. The row's OGP action is read from `surg_lookup[code]["For OGP's Action (Remove/Retain Hospital Bill Size)"]` (single space) and passed into `create_tosp_page`.

### Reused functions / utilities (no changes)

- `get_hospital_bill_overall(records)` — [tosp_hospital_bill_overall.py:4](tosp_hospital_bill_overall.py#L4)
- `get_hospital_bill_by_hospital(records)` — [tosp_hospital_bill_by_hospital.py:28](tosp_hospital_bill_by_hospital.py#L28)
- `get_moh_recommended_fees(records, surg_fees, ann_fees, hosp_fees)` — [tosp_moh_recommended_fees.py:6](tosp_moh_recommended_fees.py#L6)
- `get_fees_with_gst(fees)` — [utils.py:6](utils.py#L6) — short-circuits when `fees is None`.

---

## Plan 2 — Rename JSON files when `Updated TOSP code` differs from `Current TOSP code`

### Context

The script is run **incrementally** against an existing `output-tosp/` directory. Two rules:

1. Only files whose names match a row in `test-fee-benchmarks-surgeon.csv` should change. All other JSON files in `output-tosp/` are left untouched (the driver-CSV behavior from Plan 1 already enforces this).
2. A row may carry a TOSP-code rename, encoded by a difference between `Current TOSP code` and `Updated TOSP code`. When that happens:
   - The existing file (named after the *current* code) is renamed to the *updated*-code filename.
   - `page.title` in the JSON is rewritten to `"{Updated TOSP code} - {Updated Description}"`.
   - When the two codes are equal (or `Updated TOSP code` is blank), nothing happens.

The original page-template line `output["page"]["title"] = first_record['Current TOSP code'] + " - " + first_record['Updated Description']` was deliberately left untouched as the default; the title mutation happens *only* in the rename branch.

### Changes in `tosp.py`

1. **`import os`** added at [tosp.py:2](tosp.py#L2).
2. **Rename + rewrite block** appended at the end of `create_tosp_page` ([tosp.py:456-466](tosp.py#L456-L466)):
   ```python
   updated_code = str(first_record.get('Updated TOSP code', '')).strip()
   if updated_code and updated_code != tosp_code:
     new_output_file = f"{OUTPUT_DIRECTORY}/tosp-{updated_code.replace('>', 'more-than-').replace('≤', 'less-than-').replace('<=', 'less-than-').replace('>=', 'more-than-')}-bill-information.json".lower().replace("_", "-")
     if new_output_file != output_file:
       os.rename(output_file, new_output_file)
     output["page"]["title"] = updated_code + " - " + first_record['Updated Description']
     with open(new_output_file, 'w') as file:
       json.dump(output, file, indent=2)
   ```

### Behavior summary

- File is always first written to its *current*-code filename.
- If the row carries a code rename, the file is moved on disk via `os.rename` (preserving inode), then its `page.title` is updated and the file is rewritten in place under the new name.
- Edge case: on POSIX, `os.rename` overwrites the destination silently if it exists. Treated as acceptable since the renamed-target filename should be unused (it's a new code).

---

## Running the script

```bash
cd /Users/yongteng/Documents/GitHub/isomer-tooling/migrate-template-next/01-jun-2026
source .venv/bin/activate    # venv with pandas installed
python tosp.py
```

Requires Python 3.12+ (nested-quote f-strings at [tosp.py:57](tosp.py#L57) and [tosp.py:64](tosp.py#L64)). Output directory `output-tosp/` must exist.

## Known data quirks

- The CSV had a duplicate `Current TOSP code` (`SK759S` appeared twice) which produced 456 files from 457 rows — the dict-based `surg_lookup` keeps the last occurrence.
- Some rows have `'-'`, empty, or `'Removed'` in fee-bound columns — these are treated as missing, making the whole fees dict `None`.

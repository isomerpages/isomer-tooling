# marking.py
import json
import os
import sys
import csv
from pathlib import Path
from datetime import datetime

def find_content_items(content, item_type):
    """Recursively find all items of a specific type in content"""
    items = []
    
    if isinstance(content, dict):
        if content.get('type') == item_type:
            items.append(content)
        for value in content.values():
            items.extend(find_content_items(value, item_type))
    elif isinstance(content, list):
        for item in content:
            items.extend(find_content_items(item, item_type))
    
    return items

def validate_heading_hierarchy(content):
    """Validate that headings start at level 2 and follow hierarchy across entire document"""
    errors = []
    headings = find_content_items(content, 'heading')
    
    if not headings:
        return []  # No headings found, skip validation
    
    # Check if first heading is level 2
    if headings[0].get('attrs', {}).get('level') != 2:
        errors.append("First heading must be level 2")
    
    # Check hierarchy - each heading should not skip levels
    for i in range(len(headings) - 1):
        current_level = headings[i].get('attrs', {}).get('level', 0)
        next_level = headings[i + 1].get('attrs', {}).get('level', 0)
        
        # Next heading can be same level, one level deeper, or any level shallower
        if next_level > current_level + 1:
            errors.append(f"Heading hierarchy error: jumped from level {current_level} to level {next_level}")
    
    return errors

def validate_prose_blocks_with_lists(content):
    """Validate at least 2 prose blocks, one with unordered list and one with ordered list"""
    errors = []
    
    if not isinstance(content, list):
        return errors
    
    # Find all prose blocks
    prose_blocks = [item for item in content if isinstance(item, dict) and item.get('type') == 'prose']
    
    if len(prose_blocks) < 2:
        errors.append(f"Need at least 2 prose blocks (found: {len(prose_blocks)})")
        return errors
    
    # Check for unordered list in at least one prose block
    has_unordered_in_prose = False
    for prose in prose_blocks:
        prose_content = prose.get('content', [])
        if find_content_items(prose_content, 'unorderedList'):
            has_unordered_in_prose = True
            break
    
    if not has_unordered_in_prose:
        errors.append("At least one prose block must contain an unordered list")
    
    # Check for ordered list in at least one prose block
    has_ordered_in_prose = False
    for prose in prose_blocks:
        prose_content = prose.get('content', [])
        if find_content_items(prose_content, 'orderedList'):
            has_ordered_in_prose = True
            break
    
    if not has_ordered_in_prose:
        errors.append("At least one prose block must contain an ordered list")
    
    return errors

def validate_nested_lists(content):
    """Validate that lists have nested sub-lists"""
    errors = []
    
    # Check unordered lists
    unordered_lists = find_content_items(content, 'unorderedList')
    has_nested_unordered = False
    for ul in unordered_lists:
        for item in ul.get('content', []):
            if isinstance(item, dict) and item.get('type') == 'listItem':
                # Check if this list item contains a nested list
                item_content = item.get('content', [])
                if find_content_items(item_content, 'unorderedList'):
                    has_nested_unordered = True
                    break
        if has_nested_unordered:
            break
    
    if not has_nested_unordered:
        errors.append("Unordered list must have nested sub-lists")
    
    # Check ordered lists
    ordered_lists = find_content_items(content, 'orderedList')
    has_nested_ordered = False
    for ol in ordered_lists:
        for item in ol.get('content', []):
            if isinstance(item, dict) and item.get('type') == 'listItem':
                # Check if this list item contains a nested list
                item_content = item.get('content', [])
                if find_content_items(item_content, 'orderedList'):
                    has_nested_ordered = True
                    break
        if has_nested_ordered:
            break
    
    if not has_nested_ordered:
        errors.append("Ordered list must have nested sub-lists")
    
    return errors

def validate_table_structure_and_caption(content):
    """Validate that tables have headers, cells, and proper captions"""
    errors = []
    tables = find_content_items(content, 'table')
    
    if not tables:
        errors.append("Missing table (at least 1 required)")
        return errors
    
    for table_idx, table in enumerate(tables, 1):
        # Validate caption
        caption = table.get('attrs', {}).get('caption', '')
        
        if not caption or caption.strip() == '':
            errors.append(f"Table {table_idx}: Caption cannot be empty")
        elif caption == "Table caption":
            errors.append(f"Table {table_idx}: Caption cannot be the default text 'Table caption'")
        
        # Validate table structure (has headers and cells)
        has_header = False
        has_cell = False
        
        table_content = table.get('content', [])
        for row in table_content:
            if isinstance(row, dict) and row.get('type') == 'tableRow':
                row_content = row.get('content', [])
                for cell in row_content:
                    if isinstance(cell, dict):
                        if cell.get('type') == 'tableHeader':
                            has_header = True
                        elif cell.get('type') == 'tableCell':
                            has_cell = True
        
        if not has_header:
            errors.append(f"Table {table_idx}: Missing table headers (tableHeader)")
        if not has_cell:
            errors.append(f"Table {table_idx}: Missing table cells (tableCell)")
    
    return errors

def validate_accordions(content):
    """Validate that exactly 2 accordions are present with non-empty summaries"""
    errors = []
    
    # Count accordions at the top level of content array
    accordion_count = 0
    accordions = []
    if isinstance(content, list):
        for item in content:
            if isinstance(item, dict) and item.get('type') == 'accordion':
                accordion_count += 1
                accordions.append(item)
    
    if accordion_count == 0:
        errors.append("Missing accordions (required: 2)")
    elif accordion_count == 1:
        errors.append("Only 1 accordion found (required: 2)")
    elif accordion_count > 2:
        errors.append(f"Too many accordions found: {accordion_count} (required: 2)")
    
    # Validate accordion summaries
    for idx, accordion in enumerate(accordions, 1):
        summary = accordion.get('summary', '')
        if not summary or summary.strip() == '':
            errors.append(f"Accordion {idx}: Summary cannot be empty")
    
    return errors

def validate_images(content):
    """Validate that at least 1 image is present with proper alt text and non-placeholder src"""
    errors = []
    
    # Find all images (both standalone and within other components)
    all_images = find_content_items(content, 'image')
    
    if not all_images:
        errors.append("Missing image (at least 1 required)")
        return errors
    
    for idx, image in enumerate(all_images, 1):
        # Validate alt text
        alt = image.get('alt', '')
        
        if not alt or alt.strip() == '':
            errors.append(f"Image {idx}: Alt text cannot be empty")
        elif alt == "Add your alt text here":
            errors.append(f"Image {idx}: Alt text cannot be the default text 'Add your alt text here'")
        
        # Validate src
        src = image.get('src', '')
        
        if src == "/placeholder_no_image.png":
            errors.append(f"Image {idx}: Image source cannot be the placeholder '/placeholder_no_image.png'")
    
    return errors

def validate_infocards(content):
    """Validate that infocards component is present and each card has proper title, imageAlt, and imageUrl"""
    errors = []
    infocards = find_content_items(content, 'infocards')
    
    # Check if infocards component exists
    if not infocards:
        errors.append("Missing infocards component")
        return errors
    
    for infocard_idx, infocard in enumerate(infocards, 1):
        cards = infocard.get('cards', [])
        
        if not cards:
            errors.append(f"Infocards {infocard_idx}: No cards found")
            continue
        
        for card_idx, card in enumerate(cards, 1):
            # Validate title
            title = card.get('title', '')
            if not title or title.strip() == '':
                errors.append(f"Infocards {infocard_idx}, Card {card_idx}: Title cannot be empty")
            
            # Validate imageAlt
            image_alt = card.get('imageAlt', '')
            if not image_alt or image_alt.strip() == '':
                errors.append(f"Infocards {infocard_idx}, Card {card_idx}: Image alt text cannot be empty")
            elif image_alt == "A placeholder image.":
                errors.append(f"Infocards {infocard_idx}, Card {card_idx}: Image alt text cannot be the placeholder text 'A placeholder image.'")
            
            # Validate imageUrl
            image_url = card.get('imageUrl', '')
            if not image_url or image_url.strip() == '':
                errors.append(f"Infocards {infocard_idx}, Card {card_idx}: Image URL cannot be empty")
    
    return errors

def validate_content_not_empty(content):
    """Validate that content array is not empty"""
    errors = []
    
    if not content or len(content) == 0:
        errors.append("Content array cannot be empty")
    
    return errors

def validate_page_json(json_data, filename):
    """Validate page JSON with all requirements"""
    errors = []
    page_title = "N/A"
    
    try:
        # Extract page title
        page_title = json_data['page'].get('title', 'N/A')
        
        # Validate summary
        summary = json_data['page']['contentPageHeader']['summary']
        
        if summary.strip() == '':
            errors.append("Summary cannot be empty or contain only whitespace")
        elif summary == "This is the page summary":
            errors.append("Summary cannot be the default text 'This is the page summary'")
        
        # Get content for validation
        content = json_data.get('content', [])
        
        # Validate content is not empty
        content_empty_errors = validate_content_not_empty(content)
        errors.extend(content_empty_errors)
        
        # Only continue validation if content is not empty
        if not content_empty_errors:
            # Validate heading hierarchy across entire document
            heading_errors = validate_heading_hierarchy(content)
            errors.extend(heading_errors)
            
            # Validate prose blocks with lists
            prose_errors = validate_prose_blocks_with_lists(content)
            errors.extend(prose_errors)
            
            # Validate nested lists
            nested_list_errors = validate_nested_lists(content)
            errors.extend(nested_list_errors)
            
            # Validate tables (at least 1, validate all if multiple)
            table_errors = validate_table_structure_and_caption(content)
            errors.extend(table_errors)
            
            # Validate accordions (exactly 2)
            accordion_errors = validate_accordions(content)
            errors.extend(accordion_errors)
            
            # Validate images (at least 1, validate all if multiple)
            image_errors = validate_images(content)
            errors.extend(image_errors)
            
            # Validate infocards
            infocard_errors = validate_infocards(content)
            errors.extend(infocard_errors)
            
    except KeyError as e:
        errors.append(f"Missing required field: {str(e)}")
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'title': page_title
    }

def validate_json_file(file_path):
    """Validate a single JSON file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            json_data = json.load(f)
        
        filename = os.path.basename(file_path)
        return validate_page_json(json_data, filename)
        
    except json.JSONDecodeError as e:
        return {
            'valid': False,
            'errors': [f"Invalid JSON format: {str(e)}"],
            'title': 'N/A'
        }
    except Exception as e:
        return {
            'valid': False,
            'errors': [f"Error reading file: {str(e)}"],
            'title': 'N/A'
        }

def generate_csv_report(results, directory):
    """Generate CSV report inside project folder (json-assignment-validator/reports)"""

    # 🔹 Get the directory where marking.py is located
    base_dir = Path(__file__).resolve().parent

    # 🔹 Create reports folder inside project directory
    reports_dir = base_dir / 'reports'
    reports_dir.mkdir(exist_ok=True)

    folder_name = os.path.basename(os.path.abspath(directory))
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_filename = reports_dir / f"{folder_name}_report_{timestamp}.csv"

    # 🔹 Sort files: PASS first, FAIL after
    sorted_files = sorted(
        results['files'],
        key=lambda x: (not x['valid'], x['title'])  # PASS first, then alphabetical by title
    )

    with open(report_filename, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['Name', 'Status', 'Errors']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        writer.writeheader()

        for file_result in sorted_files:
            if file_result['errors']:
                writer.writerow({
                    'Name': file_result['title'],
                    'Status': 'FAIL',
                    'Errors': file_result['errors'][0]
                })

                for error in file_result['errors'][1:]:
                    writer.writerow({
                        'Name': '',
                        'Status': '',
                        'Errors': error
                    })
            else:
                writer.writerow({
                    'Name': file_result['title'],
                    'Status': 'PASS',
                    'Errors': ''
                })

    return str(report_filename)

def validate_multiple_files(directory):
    """Validate all JSON files in a directory (summary-only output)"""
    results = {
        'total': 0,
        'passed': 0,
        'failed': 0,
        'files': []
    }

    try:
        directory_path = Path(directory)
        json_files = list(directory_path.glob('*.json'))

        if not json_files:
            print(f"No JSON files found in {directory}")
            return results

        for file_path in json_files:
            result = validate_json_file(file_path)

            results['total'] += 1

            if result['valid']:
                results['passed'] += 1
            else:
                results['failed'] += 1

            results['files'].append({
                'filename': file_path.name,
                'title': result['title'],
                'path': str(file_path),
                'valid': result['valid'],
                'errors': result['errors']
            })

        # Clean summary only
        # Clean summary only with percentages
        print("\nValidation Complete")
        print("=" * 40)

        total = results['total']
        passed = results['passed']
        failed = results['failed']

        pass_percentage = (passed / total * 100) if total > 0 else 0
        fail_percentage = (failed / total * 100) if total > 0 else 0

        print(f"Total files checked: {total}")
        print(f"Passed: {passed} ({pass_percentage:.1f}%)")
        print(f"Failed: {failed} ({fail_percentage:.1f}%)")

        print("=" * 40)

        # Generate CSV report
        if results['total'] > 0:
            generate_csv_report(results, directory)

        return results

    except Exception as e:
        print(f"Error reading directory: {str(e)}")
        return results

def main():
    """Main execution"""
    directory = sys.argv[1] if len(sys.argv) > 1 else '.'
    
    print(f"Validating JSON files in: {os.path.abspath(directory)}\n")
    
    results = validate_multiple_files(directory)
    
    # Exit with error code if any files failed
    sys.exit(1 if results['failed'] > 0 else 0)

if __name__ == '__main__':
    main()
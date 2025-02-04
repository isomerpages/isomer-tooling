import { readFileSync, writeFileSync } from 'fs';

// Recursive function to traverse the JSON structure
const FILE_PATH = "./sample.json";
const TO_MINIFY = false;
const REPLACE_TABLE_HEADER_TO_TABLE_CELL = true;

function readFile() {
    const fileContent = readFileSync(FILE_PATH, 'utf8');
    return JSON.parse(fileContent);
}

function writeFile(jsonData) {
    writeFileSync(
        FILE_PATH,
        TO_MINIFY ?
            JSON.stringify(jsonData) :
            JSON.stringify(jsonData, null, 2)
    );
}

function traverseAllNodes(node, traverse) {
    for (const key in node) {
        if (Array.isArray(node[key])) {
            node[key] = node[key].filter(item => {
                const result = traverse(item);
                return result !== null;
            });
        } else if (typeof node[key] === 'object') {
            node[key] = traverse(node[key]);
        }
    }
    return node;
}

function fixInvalidTableHeaders() {
    const jsonData = readFile();

    function traverse(node) {
        if (typeof node !== 'object' || node === null) {
            return;
        }

        // Check if current node is a tableHeader
        if (node.type === 'tableHeader' && Array.isArray(node.content)) {
            // Check if any child content is not a paragraph
            const hasNonParagraphContent = node.content.some(child => 
                child.type !== 'paragraph'
            );
            
            if (hasNonParagraphContent) {
                if (REPLACE_TABLE_HEADER_TO_TABLE_CELL) {
                    node.type = 'tableCell';
                }

                // Replace non-paragraph content with paragraph wrapper
                node.content = node.content.map(child => {
                    switch (child.type) {
                        case 'unorderedList':
                            return REPLACE_TABLE_HEADER_TO_TABLE_CELL ? child : fixUnorderedList(child);
                        case 'paragraph':
                            return isHardBreakParagraph(child) || isEmptyStringParagraph(child) ? null : child;
                        default:
                            throw new Error(`Invalid content type "${child.type}" in table header`);
                    }
                }).flat().filter(item => item !== null);
            }
        }

        return traverseAllNodes(node, traverse);
    }

    traverse(jsonData);
    writeFile(jsonData);
}

function fixUnorderedList(node) {
    return node.content.map((listItem) => ({
        type: 'paragraph',
        content: [
            {
                text: listItem.content.map((listItemChild) => listItemChild.content[0].text).join(' '),
                type: 'text'
            }
        ]
    }))
}

function isHardBreakParagraph(node) {
    const hardBreakParagraph = {
        type: 'paragraph',
        content: [{
            type: 'hardBreak'
        }]
    }
    return JSON.stringify(node) === JSON.stringify(hardBreakParagraph);
}

function isEmptyStringParagraph(node) {
    const emptyStringParagraph =  {
        type: "paragraph",
        content: [
            {
                text: " ",
                type: "text"
            }
        ]
    }
    const emptyStringParagraph2 =  {
        type: "paragraph",
        content: [
            {
                text: " ",
                type: "text"
            }
        ]
    }
    return JSON.stringify(node) === JSON.stringify(emptyStringParagraph) || JSON.stringify(node) === JSON.stringify(emptyStringParagraph2);
}

function fixHeadingFrom1To2() {
    const jsonData = readFile();

    function traverse(node) {
        if (node.type === 'heading' && node.attrs.level === 1) {
            node.attrs.level = 2;
        }

        return traverseAllNodes(node, traverse);
    }

    traverse(jsonData);
    writeFile(jsonData);
}

function removeEmptyProseComponent() {
    const jsonData = readFile();

    const emptyProseComponent = {
        type: 'prose',
        content: []
    }

    function traverse(node) {
        if (node.type === 'prose' && JSON.stringify(node) === JSON.stringify(emptyProseComponent)) {
            return null;
        }

        return traverseAllNodes(node, traverse);
    }

    traverse(jsonData);
    writeFile(jsonData);
}

function fixImageSrc() {
    const jsonData = readFile();

    function traverse(node) {
        if (node.type === 'image' && node.src === undefined) {
            node.src = '';
        }   

        return traverseAllNodes(node, traverse);
    }

    traverse(jsonData);
    writeFile(jsonData);
}

function fixInfocardsTitle() {
    const jsonData = readFile();

    function traverse(node) {
        if (node.type === 'infocards' && node.title === undefined) {
            node.title = '';
        }

        return traverseAllNodes(node, traverse);
    }

    traverse(jsonData);
    writeFile(jsonData);
}

function removeHardBreakInHeading() {
    const jsonData = readFile();

    function traverse(node) {
        if (node.type === 'heading' && Array.isArray(node.content)) {
            node.content = node.content.filter(item => item.type !== 'hardBreak');
        }

        return traverseAllNodes(node, traverse);
    }

    traverse(jsonData);
    writeFile(jsonData);
}

function addEmptyParagraphInTableHeaderAndCell() {
    const emptyParagraph = {
        type: 'paragraph',
        content: [{
            text: '',
            type: 'text'
        }]
    }

    const jsonData = readFile();
    function traverse(node) {
        if ((node.type === 'tableHeader' || node.type === 'tableCell') && Array.isArray(node.content)) {
            if (node.content.length === 0) {
                node.content = [emptyParagraph];
            }
        }

        return traverseAllNodes(node, traverse);
    }

    traverse(jsonData);
    writeFile(jsonData);
}

function removeEmptyList() {
    const jsonData = readFile();

    function traverse(node) {
        if (
            (node.type === 'unorderedList' || node.type === 'orderedList') &&
            Array.isArray(node.content)
        ) {
            // Filter out list items with empty content
            node.content = node.content.filter(item => {
                return item.content && item.content.length > 0;
            });

            // Remove the entire unordered list if it has no items left
            if (node.content.length === 0) {
                return null;
            }
        }

        return traverseAllNodes(node, traverse);
    }

    traverse(jsonData);
    writeFile(jsonData);
}

function convertImageAltFromNumberToText() {
    const jsonData = readFile();

    function traverse(node) {
        if (node.type === 'image' && node.alt && !isNaN(node.alt)) {
            node.alt = node.alt.toString();
        }

        return traverseAllNodes(node, traverse);
    }

    traverse(jsonData);
    writeFile(jsonData);
}

fixInvalidTableHeaders()
fixHeadingFrom1To2()
removeEmptyProseComponent()
fixImageSrc()
fixInfocardsTitle()
removeHardBreakInHeading()
addEmptyParagraphInTableHeaderAndCell()
removeEmptyList()
convertImageAltFromNumberToText()

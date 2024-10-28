import { readFileSync, writeFileSync } from 'fs';

// Recursive function to traverse the JSON structure
const FILE_PATH = "./sample.json";
const TO_MINIFY = false;

function fixInvalidTableHeaders() {
    const fileContent = readFileSync(FILE_PATH, 'utf8');
    const jsonData = JSON.parse(fileContent);

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
                // Replace non-paragraph content with paragraph wrapper
                node.content = node.content.map(child => {
                    switch (child.type) {
                        case 'unorderedList':
                            return fixUnorderedList(child);
                        case 'paragraph':
                            return isHardBreakParagraph(child) ? null : child;
                        default:
                            throw new Error(`Invalid content type "${child.type}" in table header`);
                    }
                }).flat().filter(item => item !== null);
            }
        }

        // Traverse all properties
        for (const key in node) {
            if (Array.isArray(node[key])) {
                node[key].forEach(item => traverse(item));
            } else if (typeof node[key] === 'object') {
                traverse(node[key]);
            }
        }
    }

    traverse(jsonData);
    writeFileSync(
        FILE_PATH,
        TO_MINIFY ?
            JSON.stringify(jsonData) :
            JSON.stringify(jsonData, null, 2)
    );
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

fixInvalidTableHeaders()
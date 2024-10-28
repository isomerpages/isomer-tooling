import { readFileSync, writeFileSync } from 'fs';

// Recursive function to traverse the JSON structure
const FILE_PATH = "./sample.json";
const TO_MINIFY = false;

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

function fixHeadingFrom1To2() {
    const jsonData = readFile();

    function traverse(node) {
        if (node.type === 'heading' && node.attrs.level === 1) {
            node.attrs.level = 2;
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

        // Traverse all properties
        for (const key in node) {
            if (Array.isArray(node[key])) {
                node[key] = node[key].filter(item => {
                    const result = traverse(item);
                    return result !== null;
                });
            } else if (typeof node[key] === 'object') {
                traverse(node[key]);
            }
        }
        return node;
    }
    traverse(jsonData);
    writeFile(jsonData);
}

fixInvalidTableHeaders()
fixHeadingFrom1To2()
removeEmptyProseComponent()

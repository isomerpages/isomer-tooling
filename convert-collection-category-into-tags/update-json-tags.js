const fs = require('fs').promises;
const path = require('path');

async function processJsonFiles(folderPath, tagName) {
    try {
        // Read all files in the directory
        const files = await fs.readdir(folderPath);
        
        // Filter for JSON files
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        for (const file of jsonFiles) {
            const filePath = path.join(folderPath, file);
            
            // Read and parse JSON file
            const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
            
            if (data.page) {
                // Step 1: Add tags field with initial structure
                data.page.tags = [{ "category": tagName, "selected": [] }];
                
                // Step 2: Split category and add to selected array
                if (data.page.category) {
                    const categories = data.page.category.split(',').map(cat => cat.trim());
                    data.page.tags[0].selected = categories;
                    
                    // Step 3: Remove the category field
                    delete data.page.category;
                }
                
                // Write the modified JSON back to file
                await fs.writeFile(
                    filePath, 
                    JSON.stringify(data, null, 2),
                    'utf8'
                );
                
                console.log(`Processed: ${file}`);
            }
        }
        
        console.log('All files processed successfully!');
    } catch (error) {
        console.error('Error processing files:', error);
    }
}

processJsonFiles("schema/corrections-and-clarifications", "Topic"); 
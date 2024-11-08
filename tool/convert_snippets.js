const fs = require('fs');
const path = require('path');

function convertJsonToSnippet(jsonData) {
    let output = '';
    
    // Iterate through each snippet in the JSON
    for (const [key, value] of Object.entries(jsonData)) {
        // Add snippet header
        output += `snippet ${value.prefix}\n`;
        
        // Convert body array to properly formatted string
        const bodyContent = value.body
            .map(line => {
                // Escape dollar signs and tabs
                const escapedLine = line
                    .replace(/\$/g, '\\$')
                    .replace(/\t/g, '    ')
                    .toLowerCase();
                return `\t${escapedLine}`;
            })
            .join('\n');
            
        output += `${bodyContent}\n`;
    }
    
    // Wrap the output in module.exports and template literal
    return `module.exports = \`${output}\``;
}

// Main function to read and process the file
function processFile(filePath) {
    try {
        // Read the JSON file
        const jsonContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(jsonContent);
        
        // Convert to snippet format
        const snippetContent = convertJsonToSnippet(jsonData);
        
        // Write to output file
        const outputPath = path.join(
            path.dirname(filePath),
            `${path.basename(filePath, '.json')}.snippets.js`
        );
        fs.writeFileSync(outputPath, snippetContent);
        
        console.log(`Successfully converted ${filePath} to ${outputPath}`);
        
    } catch (error) {
        console.error('Error processing file:', error.message);
    }
}

// If running directly (not imported as module)
if (require.main === module) {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('Please provide a file path as an argument');
        process.exit(1);
    }
    processFile(filePath);
}

// Export for module usage
module.exports = { convertJsonToSnippet, processFile };
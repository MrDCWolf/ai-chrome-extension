import fs from 'fs';
import path from 'path';
import url from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import standaloneCode from 'ajv/dist/standalone/index.js';

// Dynamically import the schema using file URL
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, '../src/dsl/schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

// Configure Ajv
const ajv = new Ajv({ 
    code: { source: true, esm: true }, // Generate ESM source code
    schemas: { main: schema }, // Pass schema directly
    strict: false // Adjust strictness if needed based on schema
});
addFormats(ajv); // Add formats support

// Compile the main schema
const validate = ajv.getSchema('main');
if (!validate) {
    console.error("Failed to get compiled schema function.");
    process.exit(1);
}

// Generate standalone ESM code
let moduleCode = standaloneCode(ajv, validate);

// Add export statement compatible with ESM
moduleCode = moduleCode.replace('module.exports = validate;', 'export default validate;')
                     .replace('exports.default = validate;', 'export default validate;')
                     .replace(/^\"use strict\";/, ''); // Remove strict mode if present

// Define output path
const outputPath = path.resolve(__dirname, '../src/dsl/validator.standalone.mjs');

// Write the ESM code to the file
fs.writeFileSync(outputPath, moduleCode);

console.log(`Standalone validator code generated successfully at ${outputPath}`); 
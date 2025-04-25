import Ajv from 'ajv';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
// import { fileURLToPath } from 'url'; // Removed

// Get the directory name relative to project root (assuming test runs from root)
// const __filename = fileURLToPath(import.meta.url); // Removed
// const __dirname = path.dirname(__filename); // Removed

// Load schema using fs, assuming path relative to project root
const schemaPath = path.join('src', 'dsl', 'schema.json'); // Adjusted path
const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
const schema = JSON.parse(schemaContent);

// Define a basic Workflow type based on the schema
// Consider generating this from the schema for better accuracy/maintenance
interface StepCondition {
    ifExists?: string;
    ifValue?: {
        selector: string;
        equals: string;
    };
}

interface StepLoop {
    times?: number;
    items?: unknown[]; // Can be any type based on usage
}

interface Step {
    action: string;
    selector?: string;
    value?: string;
    loop?: StepLoop;
    condition?: StepCondition;
    jsHatch?: string;
}

export interface Workflow {
    steps: Step[];
}

const ajv = new Ajv();
const validate = ajv.compile<Workflow>(schema);

/**
 * Parses a YAML string into a Workflow object and validates it against the schema.
 * Throws an error if parsing or validation fails.
 *
 * @param yamlText The YAML string representing the workflow.
 * @returns The validated Workflow object.
 * @throws Error if YAML is malformed or doesn't match the schema.
 */
export function loadDslFromYaml(yamlText: string): Workflow {
    let jsonData: unknown;

    try {
        jsonData = yaml.load(yamlText);
    } catch (e: unknown) {
        // Provide more context for YAML parsing errors
        const errorMessage = e instanceof Error ? e.message : 'Unknown YAML parsing error';
        throw new Error(`Failed to parse YAML: ${errorMessage}`);
    }

    // Type guard to ensure jsonData is an object before validation
    if (typeof jsonData !== 'object' || jsonData === null) {
        throw new Error('Parsed YAML is not a valid object.');
    }

    if (validate(jsonData)) {
        // The type cast is safe here because validation passed
        return jsonData as Workflow;
    } else {
        // Combine validation errors into a single message
        const errorMessages = validate.errors
            ?.map(err => `Error at path '${err.instancePath}': ${err.message}`)
            .join('\n');
        throw new Error(`Schema validation failed:\n${errorMessages}`);
    }
} 
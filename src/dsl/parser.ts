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

// --- Type Definitions for Workflow Steps (Discriminated Union) ---

// Reusable definitions matching schema
interface LoopDefinition {
    times?: number;
    items?: any[];
}

interface ConditionDefinition {
    ifExists?: string;
    ifValue?: {
        selector: string;
        equals: string;
    };
}

interface ConditionCheck {
    conditionType: 'ifExists' | 'ifValue';
    selector: string;
    equalsValue?: string;
}

// Base interface for common properties (optional)
interface BaseStep {
    loop?: LoopDefinition;
    stepCondition?: ConditionDefinition;
}

// Interfaces for specific action types
interface LogStep extends BaseStep {
    action: 'log';
    value: string;
}

interface WaitStep extends BaseStep {
    action: 'wait';
    value: number; // Changed to number
}

interface ClickStep extends BaseStep {
    action: 'click';
    selector: string;
    value?: string; // Optional value
}

interface TypeStep extends BaseStep {
    action: 'type';
    selector: string;
    value: string;
}

interface NavigateStep extends BaseStep {
    action: 'navigate'; // Assuming navigate might exist
    value: string;
}

interface JsHatchStep extends BaseStep {
    action: 'jsHatch';
    code: string;
    description?: string;
    value?: any; // Optional value/context for substitution
    selector?: string; // Optional selector/context
}

// Add interface for waitForElement
interface WaitForElementStep extends BaseStep {
    action: 'waitForElement';
    selector: string;
    timeout?: number; // Optional timeout, default from schema
}

// Interfaces for control flow actions
interface IfStep extends BaseStep {
    action: 'if';
    condition: ConditionCheck;
    then: Step[];
    else?: Step[];
}

interface LoopStep extends BaseStep { // Extends BaseStep for optional inline loop/stepCondition
    action: 'loop';
    forEach: { // Corresponds to forEach object in schema
        in?: any[];
        times?: number;
    };
    do: Step[];
}

// Export the specific types along with the union type
export type {
    LogStep, WaitStep, ClickStep, TypeStep, NavigateStep, JsHatchStep, IfStep, LoopStep,
    WaitForElementStep, // Export the new type
    BaseStep, ConditionCheck, ConditionDefinition, LoopDefinition // Also export helper types if needed elsewhere
};

// The main Step type: a union of all possible step structures
export type Step = 
    | LogStep
    | WaitStep
    | ClickStep
    | TypeStep
    | NavigateStep
    | JsHatchStep
    | IfStep
    | LoopStep
    | WaitForElementStep; // Add to the union

// Workflow interface using the new Step union type
export interface Workflow {
    name?: string;
    description?: string;
    steps: Step[];
}

// --- AJV Setup and Validation Function (remains mostly the same) ---

const ajv = new Ajv();
// Although we defined TS types, validation still uses the JSON schema
const validate = ajv.compile<Workflow>(schema);

/**
 * Parses YAML and validates against the schema.
 */
export function loadDslFromYaml(yamlText: string): Workflow {
    let jsonData: unknown;
    try {
        jsonData = yaml.load(yamlText);
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown YAML parsing error';
        throw new Error(`Failed to parse YAML: ${errorMessage}`);
    }
    if (typeof jsonData !== 'object' || jsonData === null) {
        throw new Error('Parsed YAML is not a valid object.');
    }
    if (validate(jsonData)) {
        // Validation passed, cast is safe according to schema
        // Note: TS types and JSON schema should be kept in sync!
        return jsonData as Workflow;
    } else {
        const errorMessages = validate.errors
            ?.map(err => `Error at path '${err.instancePath}': ${err.message}`)
            .join('\n');
        throw new Error(`Schema validation failed:\n${errorMessages}`);
    }
} 
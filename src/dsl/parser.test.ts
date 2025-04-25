import { loadDslFromYaml } from './parser';

// Sample valid YAML
const validYaml = `
steps:
  - action: navigate
    value: "https://example.com"
  - action: click
    selector: "#login"
    condition:
      ifExists: "#login"
`;

// Sample YAML with syntax error (incorrect indentation)
const malformedYaml = `
steps:
  - action: navigate
   value: "https://example.com" # Indentation error
`;

// Sample YAML that is valid syntax but violates the schema (missing required 'action')
const schemaViolationYaml = `
steps:
  - selector: "#some-id"
    value: "test"
  - action: click
    selector: "button"
`;

// Sample YAML that is not an object
const notObjectYaml = `"just a string"`;

describe('loadDslFromYaml', () => {
    it('should parse and validate valid YAML correctly', () => {
        const workflow = loadDslFromYaml(validYaml);
        expect(workflow).toBeDefined();
        expect(workflow.steps).toBeInstanceOf(Array);
        expect(workflow.steps.length).toBe(2);
        expect(workflow.steps[0].action).toBe('navigate');
        expect(workflow.steps[1].action).toBe('click');
        expect(workflow.steps[1].condition?.ifExists).toBe('#login');
    });

    it('should throw an error for malformed YAML', () => {
        expect(() => {
            loadDslFromYaml(malformedYaml);
        }).toThrow(/Failed to parse YAML/);
    });

    it('should throw an error for YAML violating the schema', () => {
        expect(() => {
            loadDslFromYaml(schemaViolationYaml);
        }).toThrow(/Schema validation failed/);
        // Check for specific error message if desired
        expect(() => {
            loadDslFromYaml(schemaViolationYaml);
        }).toThrow(/must have required property 'action'/);
        // Check the error path
        expect(() => {
            loadDslFromYaml(schemaViolationYaml);
        }).toThrow(/Error at path '\/steps\/0'/);
    });

    it('should throw an error if the parsed YAML is not an object', () => {
        expect(() => {
            loadDslFromYaml(notObjectYaml);
        }).toThrow('Parsed YAML is not a valid object.');
    });
}); 
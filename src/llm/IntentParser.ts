/// <reference types="chrome" />

// Restore LLMClient import
import { LLMClient } from './LLMClient.ts';
import dslSchema from '../dsl/schema.json'; // Import the schema
import { Workflow } from '../dsl/parser'; // Import the Workflow type from parser.ts
// Import the generated standalone validator (ESM)
import validateWorkflow from '../dsl/validator.standalone.mjs';
import { ErrorObject } from 'ajv';

// Define the expected structure for an action object (kept for reference, but Workflow is main type now)
export interface Action {
  action: string;
  selector?: string;
  value?: string;
}

// Refined system prompt
const SYSTEM_PROMPT = `
You are an expert assistant that converts natural language commands into a JSON workflow object.
Your output MUST be a single JSON object that strictly adheres to the following JSON schema:

${JSON.stringify(dslSchema, null, 2)}

Key requirements for the output JSON:
- The JSON object MUST ONLY contain the properties explicitly defined in the root of the schema: 'name' (optional string), 'description' (optional string), and 'steps' (required array).
- DO NOT include '$schema' or 'title' properties in the output JSON object.
- Generate a concise 'name' and 'description' for the workflow based on the user prompt.
- Focus on translating the user's intent into the defined actions within the 'steps' array (click, type, navigate, wait, log, jsHatch, if, loop, waitForElement).
- **IMPORTANT:** After a 'navigate' action, or before interacting with an element that might load dynamically (like a search result list or a popup element), ALWAYS include a subsequent 'waitForElement' step targeting a relevant selector on the newly loaded page/content. Only use the simple 'wait' action for fixed delays unrelated to page content.
- **SPECIFIC GUIDANCE for Google Search:** When targeting the main search input field on google.com, use the selector \`textarea[name='q']\` in both 'waitForElement' and 'type' steps.
- Ensure the output is ONLY the JSON object itself, with no explanations, comments, or surrounding text.

Example of expected output structure:
{
  "name": "Example Navigation and Interaction",
  "description": "Navigates, waits for an element, and then interacts.",
  "steps": [
    { "action": "navigate", "value": "https://example.com" },
    { "action": "waitForElement", "selector": "#main-content" },
    { "action": "type", "selector": "#search", "value": "example query" },
    { "action": "click", "selector": "#button" }
  ]
}
`;

const DEFAULT_MODEL = 'gpt-4o-mini'; // Restore default model

// Restore getApiKey function
function getApiKey(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['openaiApiKey'], (result: { [key: string]: any }) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(`Error retrieving API key: ${chrome.runtime.lastError.message}`));
      }
      const apiKey = result.openaiApiKey;
      if (!apiKey || typeof apiKey !== 'string') {
        return reject(new Error('OpenAI API key not found or invalid in storage. Please set it in the extension options.'));
      }
      resolve(apiKey);
    });
  });
}

/**
 * Parses a natural language prompt into a structured Workflow object using an LLM.
 * Uses a pre-compiled standalone validator.
 *
 * @param prompt The natural language prompt describing the desired workflow.
 * @param model Optional: The OpenAI model to use (defaults to DEFAULT_MODEL).
 * @returns A promise that resolves to a validated Workflow object.
 * @throws Error if the API key is not set, the LLM call fails, the response is not valid JSON,
 *         or the JSON does not conform to the DSL schema.
 */
export async function parseIntent(prompt: string, model: string = DEFAULT_MODEL): Promise<Workflow> {

  let apiKey: string;
  try {
      apiKey = await getApiKey();
  } catch (error) {
      console.error("[IntentParser] Failed to get API key:", error);
      throw error;
  }

  const llmClient = new LLMClient(apiKey);
  // Construct the prompt for the LLM
  const fullPrompt = `${SYSTEM_PROMPT}\n\nUser prompt: ${prompt}`;

  try {
    console.log(`[IntentParser] Sending prompt to LLM (${model}):\n${prompt}`);
    // Restore the llmClient.ask call
    const jsonResponse = await llmClient.ask(model, fullPrompt);
    console.log("[IntentParser] Received response from LLM:", jsonResponse);

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(jsonResponse);
    } catch (jsonError) {
      console.error('[IntentParser] LLM response was not valid JSON:', jsonResponse, jsonError);
      throw new Error(`Failed to parse LLM response as JSON. Response: ${jsonResponse}`);
    }

    // Post-process: Create a new object with only allowed properties
    const allowedProperties = new Set(['name', 'description', 'steps']);
    const filteredWorkflow: Partial<Workflow> = {}; // Use Partial<Workflow> type
    let propertyRemovedOrDuplicate = false;

    for (const key in parsedJson) {
      if (allowedProperties.has(key)) {
        const typedKey = key as keyof Workflow; // Cast key for type safety
        // Handle potential duplicate description
        if (typedKey === 'description' && filteredWorkflow.description !== undefined) {
          console.warn("[IntentParser] Duplicate 'description' key found, using first occurrence.");
          propertyRemovedOrDuplicate = true;
          continue; // Skip subsequent descriptions
        }
        // Assign allowed property
        filteredWorkflow[typedKey] = parsedJson[key];
      } else {
        console.warn(`[IntentParser] Removing unexpected top-level property from LLM response: ${key}`);
        propertyRemovedOrDuplicate = true;
      }
    }

    // Ensure steps property exists if it was allowed but maybe missing in source
    // (Schema actually requires it, but good practice)
    if (!filteredWorkflow.steps) {
        console.warn("[IntentParser] LLM response missing 'steps' array after filtering. Adding empty array.");
        filteredWorkflow.steps = []; 
    }
    
    if (propertyRemovedOrDuplicate) {
        console.log("[IntentParser] Filtered workflow object before validation:", JSON.stringify(filteredWorkflow, null, 2));
    } else {
        console.log("[IntentParser] Original workflow object (no filtering needed) before validation:", JSON.stringify(filteredWorkflow, null, 2));
    }

    // Validate the *filtered* object against the schema
    if (validateWorkflow(filteredWorkflow)) {
      console.log("[IntentParser] Workflow object validated successfully.");
      // Cast is safe because validateWorkflow is a type predicate `data is Workflow`
      return filteredWorkflow as Workflow;
    } else {
      const validationErrors: ErrorObject[] = validateWorkflow.errors || [];
      console.error('[IntentParser] Workflow object failed schema validation:', validationErrors);
      const errorText = validationErrors.map((e: ErrorObject) => `${e.instancePath || ''} ${e.message}`).join(', ');
      throw new Error(`LLM response failed schema validation after filtering: ${errorText}`);
    }

  } catch (error) {
    console.error('[IntentParser] Error during intent parsing:', error);
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith('LLM request failed:') || message.startsWith('Failed to parse') || message.startsWith('LLM response failed')) {
        throw error;
    }
    throw new Error(`Intent parsing failed: ${message}`);
  }
} 
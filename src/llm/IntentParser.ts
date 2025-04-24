/// <reference types="chrome" />

import { LLMClient } from './LLMClient.ts';

// Define the expected structure for an action object
export interface Action {
  action: string;
  selector?: string;
  value?: string;
}

const SYSTEM_PROMPT = "Parse the user prompt into a JSON array of actions. Each action object should have 'action', optional 'selector', and optional 'value'. Example output: [{\"action\":\"click\",\"selector\":\"#submit-button\"},{\"action\":\"type\",\"selector\":\"#username\",\"value\":\"testuser\"}]";
const DEFAULT_MODEL = 'o4-mini-high'; // Corrected default model

/**
 * Retrieves the OpenAI API key from Chrome storage.
 * @returns A promise that resolves to the API key string, or rejects if not found.
 */
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
 * Parses a natural language prompt into a structured list of actions using an LLM.
 * Retrieves the API key from chrome.storage.local.
 *
 * @param prompt The natural language prompt describing the desired actions.
 * @param model Optional: The OpenAI model to use (defaults to DEFAULT_MODEL).
 * @returns A promise that resolves to an array of Action objects.
 * @throws Error if the API key is not set, the LLM call fails, the response is not valid JSON,
 *         or the JSON does not conform to the Action[] schema.
 */
export async function parseIntent(prompt: string, model: string = DEFAULT_MODEL): Promise<Action[]> {

  let apiKey: string;
  try {
      apiKey = await getApiKey();
  } catch (error) {
      // Re-throw error from getApiKey (e.g., key not set)
      throw error;
  }

  const llmClient = new LLMClient(apiKey);
  const fullPrompt = `${SYSTEM_PROMPT}\n\nUser prompt: ${prompt}`;

  try {
    const jsonResponse = await llmClient.ask(model, fullPrompt);

    let parsedActions: any[];
    try {
      parsedActions = JSON.parse(jsonResponse);
    } catch (jsonError) {
      console.error('LLM response was not valid JSON:', jsonResponse);
      throw new Error(`Failed to parse LLM response as JSON: ${(jsonError as Error).message}`);
    }

    // Basic schema validation
    if (!Array.isArray(parsedActions)) {
      throw new Error('LLM response is not a JSON array.');
    }

    const validatedActions: Action[] = [];
    for (const item of parsedActions) {
      if (typeof item !== 'object' || item === null || typeof item.action !== 'string') {
        throw new Error('Invalid action object in LLM response: ' + JSON.stringify(item));
      }
      if (item.selector !== undefined && typeof item.selector !== 'string') {
         throw new Error('Invalid selector type in action object: ' + JSON.stringify(item));
      }
       if (item.value !== undefined && typeof item.value !== 'string') {
         throw new Error('Invalid value type in action object: ' + JSON.stringify(item));
      }
      validatedActions.push(item as Action);
    }

    return validatedActions;

  } catch (error) {
    // Catch errors from LLMClient.ask or our validation
    console.error('Error parsing intent:', error);
    const message = error instanceof Error ? error.message : String(error);
    // Avoid re-wrapping LLMClient's specific error message
    if (message.startsWith('LLM request failed:')) {
        throw error;
    }
    throw new Error(`Intent parsing failed: ${message}`);
  }
} 
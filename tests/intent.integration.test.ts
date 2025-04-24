import 'openai/shims/node';
import dotenv from 'dotenv';
import path from 'path';
// Explicitly import Jest globals
import { describe, test, expect, beforeAll, jest } from '@jest/globals';
import { LLMClient } from '../src/llm/LLMClient'; // Adjust path if needed
// Import the Action interface and necessary constants/prompts if they are exported
// If SYSTEM_PROMPT is not exported, we have to redefine it here.
import { Action } from '../src/llm/IntentParser'; 

// !! If SYSTEM_PROMPT is not exported from IntentParser.ts, define it here !!
const SYSTEM_PROMPT = "Parse the user prompt into a JSON array of actions. Each action object should have 'action', optional 'selector', and optional 'value'. Example output: [{\"action\":\"click\",\"selector\":\"#submit-button\"},{\"action\":\"type\",\"selector\":\"#username\",\"value\":\"testuser\"}]";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.OPENAI_API_KEY;

// Determine if tests should be skipped
const describeIfApiKey = apiKey ? describe : describe.skip;

describeIfApiKey('LLM Integration Tests (Live API)', () => {
  let llmClient: LLMClient;

  // Set a longer timeout for API calls
  jest.setTimeout(30000); // 30 seconds

  beforeAll(() => {
    // Initialize clients only if API key is present (redundant check, but safe)
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not found in environment variables. Skipping integration tests.");
    }
    llmClient = new LLMClient(apiKey);
  });

  test('LLMClient.ask should return a non-empty response', async () => {
    const prompt = 'Hello';
    const response = await llmClient.ask('gpt-3.5-turbo', prompt);
    console.log(`LLMClient.ask Response: ${response}`); // Log response for debugging
    expect(response).toBeDefined();
    expect(response.trim()).not.toBe('');
  });

  test('LLM should parse "Click login" intent correctly', async () => {
    const userPrompt = 'Click login';
    const fullPrompt = `${SYSTEM_PROMPT}\n\nUser prompt: ${userPrompt}`;
    const model = 'gpt-3.5-turbo'; // Or use the default from IntentParser if needed

    const jsonResponse = await llmClient.ask(model, fullPrompt);
    console.log(`Intent Parser LLM Response: ${jsonResponse}`);

    let parsedActions: any[];
    try {
      parsedActions = JSON.parse(jsonResponse);
    } catch (jsonError) {
      console.error('LLM response was not valid JSON:', jsonResponse);
      throw new Error(`Failed to parse LLM response as JSON: ${(jsonError as Error).message}`);
    }

    // Basic schema validation (similar to parseIntent function)
    expect(Array.isArray(parsedActions)).toBe(true);

    const validatedActions: Action[] = [];
    for (const item of parsedActions) {
      expect(typeof item).toBe('object');
      expect(item).not.toBeNull();
      expect(typeof item.action).toBe('string');
      if (item.selector !== undefined) expect(typeof item.selector).toBe('string');
      if (item.value !== undefined) expect(typeof item.value).toBe('string');
      validatedActions.push(item as Action);
    }

    // Check content for the specific prompt
    const loginClickAction = validatedActions.find(action => 
        action.action === 'click' && 
        action.selector && // Ensure selector exists
        action.selector.toLowerCase().includes('login') 
     );
     expect(loginClickAction).toBeDefined();
  });

  // Add more integration tests as needed...
});

// Dummy test outside the conditional describe block to ensure file is processed by Jest
// This avoids Jest errors if the API key is missing and the main describe block is skipped.
test('Integration test file loaded', () => {
  expect(true).toBe(true);
}); 
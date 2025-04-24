/** @jest-environment node */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { parseIntent, Action } from '../src/llm/IntentParser.ts'; // Need .ts for node ESM tests
import { LLMClient } from '../src/llm/LLMClient.ts';

// Type for the storage callback
type StorageCallback = (items: { [key: string]: any }) => void;

// Mock chrome.storage.local for testing getApiKey
const mockGet = jest.fn();
global.chrome = {
  storage: {
    local: {
      get: mockGet as (keys: string | string[] | null, callback: StorageCallback) => void,
    }
  },
  runtime: {
    lastError: undefined // Mock lastError as undefined by default
  }
} as any; // Use 'as any' for simplicity in mocking the chrome global

// Mock only the ask method of LLMClient prototype
const mockAsk = jest.fn<() => Promise<string>>(); // Add type hint for mockAsk
jest.mock('../src/llm/LLMClient.ts', () => { // Mock .ts file
  return {
    LLMClient: jest.fn().mockImplementation(() => {
      return { ask: mockAsk }; // Mock instance only needs the ask method
    })
  };
});

// Cast LLMClient to its mocked type for constructor checks
const MockedLLMClientConstructor = LLMClient as jest.Mock;

describe('parseIntent', () => {
  const prompt = 'Click the login button then type username';
  const model = 'test-model';
  const testApiKey = 'stored-api-key';

  beforeEach(() => {
    // Clear all instances and calls to constructor and methods
    MockedLLMClientConstructor.mockClear();
    mockAsk.mockClear(); // Clear the ask mock
    mockGet.mockClear(); // Clear the storage mock
    if (global.chrome?.runtime) { // Ensure runtime exists before setting lastError
        global.chrome.runtime.lastError = undefined; // Reset lastError
    }
    // Default mock for storage get: resolves with the key
    mockGet.mockImplementation((keys: string | string[] | null, callback: StorageCallback) => {
        callback({ openaiApiKey: testApiKey });
    });
  });

  it('throws if API key is not found in storage', async () => {
    // Mock storage get to return no key
    mockGet.mockImplementation((keys: string | string[] | null, callback: StorageCallback) => {
        callback({}); 
    });
    await expect(parseIntent(prompt)).rejects.toThrow('OpenAI API key not found or invalid in storage.');
  });
  
  it('throws if chrome.storage.local.get has an error', async () => {
    const storageError = { message: 'Storage failed' };
    // Mock storage get to call back with an error
    mockGet.mockImplementation((keys: string | string[] | null, callback: StorageCallback) => {
        if (global.chrome?.runtime) {
             global.chrome.runtime.lastError = storageError;
        }
        callback({}); // Callback might still be called
    });
    await expect(parseIntent(prompt)).rejects.toThrow(`Error retrieving API key: ${storageError.message}`);
  });

  it('calls LLMClient constructor with retrieved key and ask method correctly', async () => {
    mockAsk.mockResolvedValue('[]'); // Should infer string type now

    await parseIntent(prompt, model);

    expect(mockGet).toHaveBeenCalledWith(['openaiApiKey'], expect.any(Function));
    expect(MockedLLMClientConstructor).toHaveBeenCalledWith(testApiKey); // Check constructor called with stored key
    expect(mockAsk).toHaveBeenCalledTimes(1);
    expect(mockAsk).toHaveBeenCalledWith(
      model,
      expect.stringContaining(`User prompt: ${prompt}`)
    );
  });

  it('parses a valid JSON response into an array of actions', async () => {
    const mockJsonResponse = JSON.stringify([
      { action: 'click', selector: '#login-button' },
      { action: 'type', selector: '#username', value: 'myuser' },
    ]);
    mockAsk.mockResolvedValue(mockJsonResponse); // Should infer string type now

    const actions = await parseIntent(prompt); // No longer pass apiKey

    expect(actions).toHaveLength(2);
    expect(actions[0]).toEqual({ action: 'click', selector: '#login-button' });
    expect(actions[1]).toEqual({ action: 'type', selector: '#username', value: 'myuser' });
  });

  it('throws an error if LLM response is not valid JSON', async () => {
    const invalidJsonResponse = 'this is not json';
    mockAsk.mockResolvedValue(invalidJsonResponse);
    await expect(parseIntent(prompt)).rejects.toThrow(
      'Failed to parse LLM response as JSON'
    );
  });

  it('throws an error if LLM response is not a JSON array', async () => {
    const nonArrayJsonResponse = JSON.stringify({ action: 'click' });
    mockAsk.mockResolvedValue(nonArrayJsonResponse);
    await expect(parseIntent(prompt)).rejects.toThrow(
      'LLM response is not a JSON array.'
    );
  });

  it('throws an error if an action object is invalid (missing action)', async () => {
    const invalidActionResponse = JSON.stringify([ { selector: '#button' } ]);
    mockAsk.mockResolvedValue(invalidActionResponse);
    await expect(parseIntent(prompt)).rejects.toThrow(
      'Invalid action object in LLM response:'
    );
  });

  it('throws an error if an action object has invalid selector type', async () => {
    const invalidActionResponse = JSON.stringify([ { action: 'click', selector: 123 } ]);
    mockAsk.mockResolvedValue(invalidActionResponse);
    await expect(parseIntent(prompt)).rejects.toThrow(
      'Invalid selector type in action object:'
    );
  });

  it('throws an error if an action object has invalid value type', async () => {
    const invalidActionResponse = JSON.stringify([ { action: 'type', selector: '#field', value: true } ]);
    mockAsk.mockResolvedValue(invalidActionResponse);
    await expect(parseIntent(prompt)).rejects.toThrow(
      'Invalid value type in action object:'
    );
  });

  it('re-throws errors from LLMClient.ask', async () => {
    const llmError = new Error('LLM request failed: Network error');
    mockAsk.mockRejectedValue(llmError);
    await expect(parseIntent(prompt)).rejects.toThrow(llmError);
  });
}); 
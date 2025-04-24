/** @jest-environment node */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { LLMClient } from '../src/llm/LLMClient';
import { ChatOpenAI } from '@langchain/openai';

// Keep track of the latest mock invoke function
let latestMockInvoke = jest.fn() as jest.Mock<any, any>;

// Mock the ChatOpenAI class from LangChain
jest.mock('@langchain/openai', () => {
  // Return a mock constructor that creates mock instances
  return {
    ChatOpenAI: jest.fn().mockImplementation(() => ({
      modelName: '',
      // Mock the pipe().invoke() chain
      pipe: jest.fn().mockReturnThis(),
      invoke: (...args: any[]) => latestMockInvoke(...args), // Call the tracked mock invoke
      // Helper to update the tracked mock invoke function for tests
      __setMockInvoke: (newMockInvoke: jest.Mock) => {
        latestMockInvoke = newMockInvoke as jest.Mock<any, any>;
      }
    }))
  };
});

// Cast ChatOpenAI to its mocked type for instance tracking
const MockedChatOpenAI = ChatOpenAI as jest.Mock;

describe('LLMClient', () => {
  const apiKey = 'test-api-key';

  beforeEach(() => {
    // Clear mocks before each test
    MockedChatOpenAI.mockClear();
    // Reset the tracked mock invoke function
    latestMockInvoke = jest.fn() as jest.Mock<any, any>;
  });

  it('constructor throws if API key is missing', () => {
    expect(() => new LLMClient('')).toThrow('OpenAI API key is required.');
  });

  it('constructor initializes ChatOpenAI with the API key', () => {
    new LLMClient(apiKey);
    expect(MockedChatOpenAI).toHaveBeenCalledWith({ apiKey });
  });

  describe('ask', () => {
    let client: LLMClient;
    let mockInstance: any; // Use 'any' for simplicity with the mock structure

    beforeEach(() => {
      client = new LLMClient(apiKey);
      // Get the most recently created mock instance
      mockInstance = MockedChatOpenAI.mock.results[MockedChatOpenAI.mock.results.length - 1].value;
    });

    it('calls invoke with the correct model and prompt and returns the string response', async () => {
      const model = 'gpt-4.1-mini';
      const prompt = 'Hello';
      const expectedResponse = 'Hi there!';

      // Set the mock response for this specific test
      mockInstance.__setMockInvoke(jest.fn().mockResolvedValue(expectedResponse as any));

      const response = await client.ask(model, prompt);

      // Check if the model name was set on the instance
      expect(mockInstance.modelName).toBe(model);
      // Check if invoke was called correctly
      expect(latestMockInvoke).toHaveBeenCalledWith([expect.objectContaining({ content: prompt })]);
      // Check the final response
      expect(response).toBe(expectedResponse);
    });

    it('throws an error if the API call fails', async () => {
      const model = 'gpt-4.1-mini';
      const prompt = 'Hello';
      const apiError = new Error('API connection failed');

      // Set the mock to reject for this specific test
      mockInstance.__setMockInvoke(jest.fn().mockRejectedValue(apiError as any));

      await expect(client.ask(model, prompt)).rejects.toThrow(
        `LLM request failed: ${apiError.message}`
      );
    });

    it('throws an error if the response is not a string', async () => {
      const model = 'gpt-4.1-mini';
      const prompt = 'Hello';
      const unexpectedResponse = { content: 'Not a string' };

      // Set the mock response for this specific test
      mockInstance.__setMockInvoke(jest.fn().mockResolvedValue(unexpectedResponse as any));

      await expect(client.ask(model, prompt)).rejects.toThrow(
        'LLM response was not a string.'
      );
    });
  });
}); 
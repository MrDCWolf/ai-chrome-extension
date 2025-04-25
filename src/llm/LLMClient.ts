import { ChatOpenAI } from '@langchain/openai';

/**
 * A client class for interacting with OpenAI models.
 * Now uses fetch directly for the ask method to avoid potential Langchain issues in Service Worker.
 */
export class LLMClient {
  private apiKey: string;
  // Keep chatModel instance for potential future use or other methods, but don't use for ask
  private chatModel: ChatOpenAI;

  /**
   * Initializes the LLMClient with the provided OpenAI API key.
   * @param apiKey Your OpenAI API key.
   */
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required.');
    }
    this.apiKey = apiKey;
    // Still initialize chatModel in case other parts rely on it, but ask will bypass it
    this.chatModel = new ChatOpenAI({ apiKey });
  }

  /**
   * Sends a prompt to the specified OpenAI model using the fetch API and returns the assistant's reply.
   * @param model The name of the OpenAI model to use (e.g., 'gpt-4o-mini').
   * @param prompt The full prompt (including system message) for the LLM.
   * @returns A promise that resolves to the assistant's reply string.
   * @throws Error if the API call fails or returns an unexpected response.
   */
  async ask(model: string, prompt: string): Promise<string> {
    const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

    console.log(`[LLMClient] Sending request to OpenAI API (model: ${model}) via fetch.`);

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            // Assuming the prompt string contains the full context needed
            { role: 'user', content: prompt }
          ],
          // Optional: Add other parameters like temperature, max_tokens etc.
          // temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
        console.error('[LLMClient] OpenAI API request failed:', response.status, errorBody);
        throw new Error(`OpenAI API request failed: ${response.status} ${response.statusText} - ${errorBody?.error?.message || 'Unknown API error'}`);
      }

      const data = await response.json();

      // Extract the message content
      const messageContent = data?.choices?.[0]?.message?.content;
      if (typeof messageContent !== 'string') {
        console.error('[LLMClient] Unexpected OpenAI API response format:', data);
        throw new Error('LLM response content was not found or not a string.');
      }

      console.log('[LLMClient] Received successful response from OpenAI API via fetch.');
      return messageContent;

    } catch (error) {
      console.error('[LLMClient] Error asking LLM via fetch:', error);
      const message = error instanceof Error ? error.message : String(error);
      // Avoid double wrapping
      if (message.startsWith('OpenAI API request failed:')) {
        throw error;
      }
      throw new Error(`LLM request failed (fetch): ${message}`);
    }
  }
} 
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';

/**
 * A client class for interacting with OpenAI models via LangChain.
 */
export class LLMClient {
  private chatModel: ChatOpenAI;

  /**
   * Initializes the LLMClient with the provided OpenAI API key.
   * @param apiKey Your OpenAI API key.
   */
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required.');
    }
    this.chatModel = new ChatOpenAI({ apiKey });
  }

  /**
   * Sends a prompt to the specified OpenAI model and returns the assistant's reply.
   * @param model The name of the OpenAI model to use (e.g., 'gpt-4.1-mini').
   * @param prompt The user's prompt.
   * @returns A promise that resolves to the assistant's reply string.
   * @throws Error if the API call fails or returns an unexpected response.
   */
  async ask(model: string, prompt: string): Promise<string> {
    try {
      this.chatModel.modelName = model; // Update model name if needed

      const messages = [new HumanMessage(prompt)];
      const response = await this.chatModel.pipe(new StringOutputParser()).invoke(messages);

      if (typeof response !== 'string') {
        console.error('Unexpected LLM response format:', response);
        throw new Error('LLM response was not a string.');
      }

      return response;
    } catch (error) {
      console.error('Error asking LLM:', error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`LLM request failed: ${message}`);
    }
  }
} 
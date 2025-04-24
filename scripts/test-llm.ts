import { LLMClient } from '../src/llm/LLMClient.ts';
import { parseIntent } from '../src/llm/IntentParser.ts';

async function runTests() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('Error: OPENAI_API_KEY environment variable is not set.');
    console.error('Please set it first: export OPENAI_API_KEY="your_key_here"');
    process.exit(1);
  }

  console.log('--- Testing LLMClient.ask ---');
  try {
    const client = new LLMClient(apiKey);
    const simplePrompt = 'Say "Hello, Integration Test!"';
    console.log(`Sending prompt to o4-mini-high: "${simplePrompt}"`);
    const askResponse = await client.ask('o4-mini-high', simplePrompt);
    console.log('LLMClient.ask Response:', askResponse);
  } catch (error) {
    console.error('LLMClient.ask Error:', error);
  }

  console.log('\n--- Testing parseIntent ---');
  try {
    const intentPrompt = 'Click the big red button labeled Submit, then type "test" into the username field.';
    console.log(`Sending prompt for intent parsing: "${intentPrompt}"`);
    const intentResponse = await parseIntent(intentPrompt, apiKey); // Uses default 'o4-mini-high'
    console.log('parseIntent Response:', JSON.stringify(intentResponse, null, 2));
  } catch (error) {
    console.error('parseIntent Error:', error);
  }
}

runTests(); 
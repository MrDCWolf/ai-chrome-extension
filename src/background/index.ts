// Background service worker entry point
import { parseIntent } from '../llm/IntentParser.ts'; // Re-enabled import
import { Workflow } from '../dsl/parser'; // Re-enabled import
import { executeWorkflow } from '../dsl/executor.ts'; // Import the executor

console.log('[Background] Service worker script started.'); // Changed log slightly

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[Background] Received message:', message);
  
  if (message.type === 'EXECUTE_ACTION') {
    console.log('Background script forwarding action:', message.action);
    
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab?.id) {
        console.error('No active tab found');
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }

      // Send message to content script
      try {
        chrome.tabs.sendMessage(
          activeTab.id,
          message,
          (response) => {
            console.log('Content script response:', response);
            sendResponse(response);
          }
        );
      } catch (error) {
        console.error('Error sending message to content script:', error);
        sendResponse({ success: false, error: String(error) });
      }
    });
    
    return true; // Keep the message channel open for async response
  } else if (message.type === 'RUN_WORKFLOW') {
    console.log('[Background] Received RUN_WORKFLOW with prompt:', message.prompt);

    (async () => {
      let workflow: Workflow | null = null;
      let tabId: number | null = null;

      try {
        // 1. Parse the prompt
        console.log('[Background] Calling parseIntent...');
        workflow = await parseIntent(message.prompt);
        console.log('[Background] parseIntent successful! Workflow:', workflow);

        // 2. Get active tab ID
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.id) {
          throw new Error('No active tab found to execute workflow on.');
        }
        tabId = tabs[0].id;
        console.log(`[Background] Found active tab ID: ${tabId}`);

        // 3. Execute the workflow
        console.log(`[Background] Calling executeWorkflow on tab ${tabId}...`);
        await executeWorkflow(tabId, workflow);
        console.log(`[Background] executeWorkflow completed successfully on tab ${tabId}.`);

        // Send final success response
        sendResponse({ success: true, message: 'Workflow executed successfully.' });

      } catch (error) {
        console.error('[Background] Error during RUN_WORKFLOW:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during workflow processing.';
        // Include details about where the error occurred if possible
        let stage = workflow ? (tabId ? 'execution' : 'getting tab') : 'parsing';
        sendResponse({ 
            success: false, 
            error: `Workflow failed during ${stage}: ${errorMessage}` 
        });
      }
    })();

    return true; // Keep message channel open for async processing
  }
  
  console.warn('[Background] Unknown message type received:', message.type);
  return false; // Indicate synchronous handling for unknown types
});

// Extension installed handler
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Extension installed/updated.'); // Changed log slightly
});

// Test function to verify service worker is active
export function testServiceWorker() {
  console.log('Service worker test function called');
  return 'Service worker is active!';
} 
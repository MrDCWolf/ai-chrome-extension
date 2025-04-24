// Background service worker entry point
console.log('Background service worker loaded and ready');

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Background script received message:', message);
  
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
  }
  
  console.warn('Unknown message type:', message.type);
  return false;
});

// Extension installed handler
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Test function to verify service worker is active
export function testServiceWorker() {
  console.log('Service worker test function called');
  return 'Service worker is active!';
} 
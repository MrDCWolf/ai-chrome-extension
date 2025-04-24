// Background service worker entry point
console.log('Background service worker loaded');

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  
  // Handle different message types
  switch (message.type) {
    case 'EXECUTE_ACTION':
      // Forward action to content script
      chrome.tabs.sendMessage(sender.tab?.id!, message, (response) => {
        sendResponse(response);
      });
      return true; // Keep the message channel open for async response
    
    default:
      console.warn('Unknown message type:', message.type);
      return false;
  }
}); 
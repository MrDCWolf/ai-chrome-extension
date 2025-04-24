// Content script entry point
console.log('Content script loaded and ready to receive messages');

// Inject a test button into the page to trigger a message to the background script
function injectTestButton() {
  const btn = document.createElement('button');
  btn.textContent = 'Send Test Message to Background';
  btn.style.position = 'fixed';
  btn.style.bottom = '20px';
  btn.style.right = '20px';
  btn.style.zIndex = '99999';
  btn.style.padding = '10px 16px';
  btn.style.background = '#222';
  btn.style.color = '#fff';
  btn.style.border = 'none';
  btn.style.borderRadius = '6px';
  btn.style.cursor = 'pointer';
  btn.onclick = () => {
    chrome.runtime.sendMessage({ type: 'EXECUTE_ACTION', action: 'test' }, (response) => {
      console.log('Response from background:', response);
      alert('Response from background: ' + JSON.stringify(response));
    });
  };
  document.body.appendChild(btn);
}

injectTestButton();

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  // Handle the message
  if (request.type === 'EXECUTE_ACTION') {
    console.log('Executing action:', request.action);
    sendResponse({ success: true, message: `Content script received action: ${request.action}` });
  } else {
    console.log('Unknown message type:', request.type);
    sendResponse({ success: false, error: `Unknown message type: ${request.type}` });
  }
  
  return true; // Keep the message channel open for async response
});

// Export content script API
export const contentScriptAPI = {
  click: (selector: string) => {
    const element = document.querySelector(selector);
    if (element) {
      (element as HTMLElement).click();
      return true;
    }
    return false;
  },

  type: (selector: string, text: string) => {
    const element = document.querySelector(selector);
    if (element && element instanceof HTMLInputElement) {
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    return false;
  },

  navigate: (url: string) => {
    window.location.href = url;
    return true;
  },
}; 
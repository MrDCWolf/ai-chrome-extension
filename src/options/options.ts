/// <reference types="chrome" />

// Function to save the API key
function saveOptions() {
  console.log("saveOptions function called.");
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  const statusDiv = document.getElementById('status');

  if (!apiKeyInput || !statusDiv) {
    console.error('Options page elements not found!');
    return;
  }

  const apiKey = apiKeyInput.value;

  chrome.storage.local.set({ openaiApiKey: apiKey }, () => {
    // Check for errors
    if (chrome.runtime.lastError) {
      console.error(`Error saving API key: ${chrome.runtime.lastError.message}`);
      statusDiv.textContent = `Error: ${chrome.runtime.lastError.message}`;
      statusDiv.style.color = 'red'; // Indicate error visually
    } else {
      // Update status to let user know options were saved.
      console.log('API Key saved successfully.'); // Add console log
      statusDiv.textContent = 'API Key saved.';
      statusDiv.style.color = 'green'; // Ensure color is green on success
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 1500);
    }
  });
}

// Function to restore the API key from storage
function restoreOptions() {
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  const statusDiv = document.getElementById('status'); // Added statusDiv access for potential error display
  if (!apiKeyInput) return;

  chrome.storage.local.get(['openaiApiKey'], (result: { [key: string]: any }) => {
    if (chrome.runtime.lastError) {
        console.error(`Error restoring API key: ${chrome.runtime.lastError.message}`);
        if(statusDiv) { // Display error in status div if available
             statusDiv.textContent = `Error loading key: ${chrome.runtime.lastError.message}`;
             statusDiv.style.color = 'red';
        }
    } else {
        apiKeyInput.value = result.openaiApiKey || '';
        console.log('API Key restored on load:', result.openaiApiKey ? 'Found' : 'Not found'); // Log restoration
    }
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);

console.log("Attaching save listener...");
document.getElementById('save')?.addEventListener('click', saveOptions); 
// Content script entry point
console.log('Content script loaded');

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
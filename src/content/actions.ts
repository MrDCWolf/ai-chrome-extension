/**
 * Clicks an element matching the given selector
 * @param selector CSS selector for the target element
 * @throws Error if element is not found
 */
export async function click(selector: string): Promise<void> {
    const element = document.querySelector(selector);
    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }

    // Dispatch mouse events in sequence
    element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

/**
 * Types text into an input element matching the given selector
 * @param selector CSS selector for the target input element
 * @param text Text to type into the input
 * @throws Error if element is not found
 */
export async function type(selector: string, text: string): Promise<void> {
    const element = document.querySelector(selector) as HTMLInputElement;
    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }

    // Focus the element
    element.focus();

    // Set the value directly
    element.value = text;

    // Dispatch input events
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Navigates to the specified URL
 * @param url URL to navigate to
 */
export async function navigate(url: string): Promise<void> {
    window.location.href = url;
}

/**
 * Checks if an element exists for the given selector.
 * @param selector CSS selector for the target element.
 * @returns True if the element exists, false otherwise.
 */
export function checkElementExists(selector: string): boolean {
  if (!selector) {
    console.error('checkElementExists called with empty selector.');
    return false; // Or throw? Returning false might be safer in polling.
  }
  const element = document.querySelector(selector);
  return !!element;
} 
/// <reference types="chrome" />

// Import only the functions defined in actions.ts
import {
  click,
  type,
  navigate,
  checkElementExists
} from './actions';

console.log('[ContentScript] Loaded and ready.');

// --- Define Message Payloads (Mirroring Executor) ---
interface ExecuteActionPayload {
    action: string;
    selector?: string;
    value?: string;
}

interface CheckConditionPayload {
    conditionType: 'ifExists' | 'ifValue';
    selector: string;
    equalsValue?: string;
}

interface ExecuteJsHatchPayload {
    code: string;
}

// --- Helper Functions (Defined Locally) ---

/** Waits for a specified duration */
async function wait(durationMs: number): Promise<void> {
    console.log(`[ContentScript] Waiting for ${durationMs}ms`);
    return new Promise(resolve => setTimeout(resolve, durationMs));
}

/** Checks if an element exists or matches a value condition */
async function checkCondition(payload: CheckConditionPayload): Promise<{ conditionMet: boolean }> {
    const { conditionType, selector, equalsValue } = payload;
    console.log(`[ContentScript] Checking condition ${conditionType} for selector: ${selector}`);
    const element = document.querySelector(selector);

    if (conditionType === 'ifExists') {
        const met = !!element;
        console.log(`[ContentScript] Condition ifExists result: ${met}`);
        return { conditionMet: met };
    }

    if (conditionType === 'ifValue') {
        if (!element) {
            console.log(`[ContentScript] Condition ifValue failed: Element not found.`);
            return { conditionMet: false }; // Element doesn't exist, so value can't match
        }
        let elementValue: string | null = null;
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
            elementValue = element.value;
        } else {
            // Fallback for other elements (e.g., divs, spans) - might need adjustment
            elementValue = element.textContent;
        }
        const met = elementValue === equalsValue;
        console.log(`[ContentScript] Condition ifValue check: elementValue="${elementValue}", equalsValue="${equalsValue}", result: ${met}`);
        return { conditionMet: met };
    }

    throw new Error(`Unknown condition type: ${conditionType}`);
}

/** Executes arbitrary JavaScript code in the page context */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeJsHatch(code: string): Promise<any> {
    console.log(`[ContentScript] Executing jsHatch`);
    try {
        // Using Function constructor for slightly safer execution than eval
        const func = new Function(code);
        const result = await Promise.resolve(func()); // Allow hatch to be async
        console.log(`[ContentScript] jsHatch result:`, result);
        return result;
    } catch (error: unknown) {
        console.error('[ContentScript] Error executing jsHatch:', error);
        throw new Error(`jsHatch execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// --- Message Listener ---
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    console.log('[ContentScript] Received message:', request);

    if (!request || typeof request.type !== 'string') {
        console.error('[ContentScript] Invalid message structure received:', request);
        sendResponse({ success: false, error: 'Invalid message structure' });
        return false; // No async response needed
    }

    (async () => {
        try {
            switch (request.type) {
                case 'EXECUTE_ACTION': {
                    const payload = request.payload as ExecuteActionPayload;
                    if (!payload || typeof payload.action !== 'string') {
                        throw new Error('Invalid EXECUTE_ACTION payload');
                    }
                    const { action, selector, value } = payload;
                    let promise: Promise<any>;

                    switch (action) {
                        case 'click':
                            if (!selector) throw new Error('Missing selector for click action');
                            promise = click(selector);
                            break;
                        case 'type':
                            if (!selector || typeof value === 'undefined') throw new Error('Missing selector or value for type action');
                            promise = type(selector, value);
                            break;
                        case 'navigate':
                            if (typeof value === 'undefined') throw new Error('Missing value (URL) for navigate action');
                            promise = navigate(value);
                            return; // Exit IIFE early
                        case 'wait':
                            const duration = parseInt(value || '0', 10);
                            if (isNaN(duration) || duration < 0) throw new Error('Invalid duration for wait action');
                            promise = wait(duration);
                            break;
                        case 'log':
                            console.log('[Workflow Log]:', value);
                            promise = Promise.resolve({ success: true });
                            break;
                        default:
                            throw new Error(`Unknown action: ${action}`);
                    }

                    promise
                        .then(result => {
                            console.log(`Action '${action}' result:`, result);
                            const responsePayload = (typeof result === 'object' && result !== null && 'success' in result) 
                                                    ? result 
                                                    : { success: true, data: result }; 
                            sendResponse(responsePayload);
                        })
                        .catch(error => {
                            console.error(`Error executing action '${action}':`, error);
                            sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
                        });
                    break;
                }
                case 'CHECK_CONDITION': {
                    const payload = request.payload as CheckConditionPayload;
                     if (!payload || typeof payload.conditionType !== 'string' || typeof payload.selector !== 'string') {
                         throw new Error('Invalid CHECK_CONDITION payload');
                     }
                    const result = await checkCondition(payload);
                    sendResponse({ success: true, data: result });
                    break;
                }
                case 'EXECUTE_JS_HATCH': {
                     const payload = request.payload as ExecuteJsHatchPayload;
                     if (!payload || typeof payload.code !== 'string') {
                         throw new Error('Invalid EXECUTE_JS_HATCH payload');
                     }
                    const result = await executeJsHatch(payload.code);
                    sendResponse({ success: true, data: result });
                    break;
                }
                case 'CHECK_ELEMENT': {
                    const { selector } = request.payload;
                    try {
                        const exists = checkElementExists(selector);
                        console.log(`[Content Script] CHECK_ELEMENT for '${selector}': ${exists}`);
                        sendResponse({ success: true, exists: exists });
                    } catch (error) {
                        console.error(`[Content Script] Error in CHECK_ELEMENT for '${selector}':`, error);
                        sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
                    }
                    return false; // Synchronous response for check
                }
                default:
                    console.warn('[ContentScript] Unknown message type:', request.type);
                    sendResponse({ success: false, error: `Unknown message type: ${request.type}` });
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('[ContentScript] Error handling message:', request.type, error);
            sendResponse({ success: false, error: errorMessage });
        }
    })(); // Immediately invoke the async function

    return true; // Return true to indicate asynchronous response handling
});

console.log('[ContentScript] Message listener added.');

// Removed old test button and exports 
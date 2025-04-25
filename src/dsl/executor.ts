// src/dsl/executor.ts
/// <reference types="chrome" />

import { Workflow, Step, IfStep, LoopStep, JsHatchStep, NavigateStep, WaitForElementStep } from './parser'; // Assuming parser exports these types
import path from 'path';

// Define message types for communication with content script
interface BaseMessage {
    type: string;
}

interface ExecuteActionPayload {
    action: string;
    selector?: string;
    value?: string | number; // Allow number for wait action
}
interface ExecuteActionMessage extends BaseMessage {
    type: 'EXECUTE_ACTION';
    payload: ExecuteActionPayload;
}

interface CheckConditionPayload {
    conditionType: 'ifExists' | 'ifValue';
    selector: string;
    equalsValue?: string; // Only for ifValue
}
interface CheckConditionMessage extends BaseMessage {
    type: 'CHECK_CONDITION';
    payload: CheckConditionPayload;
}

interface ExecuteJsHatchPayload {
    code: string;
    value?: any;
    selector?: string;
}
interface ExecuteJsHatchMessage extends BaseMessage {
    type: 'EXECUTE_JS_HATCH';
    payload: ExecuteJsHatchPayload;
}

interface CheckElementPayload {
    selector: string;
}
interface CheckElementMessage extends BaseMessage {
    type: 'CHECK_ELEMENT';
    payload: CheckElementPayload;
}

type ContentScriptRequest = ExecuteActionMessage | CheckConditionMessage | ExecuteJsHatchMessage | CheckElementMessage;

// Response types (adjust based on actual content script implementation)
interface BaseResponse {
    success: boolean;
    error?: string;
    data?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/**
 * Sends a message to the content script of a specific tab and awaits a response.
 * @param tabId The ID of the target tab.
 * @param message The message to send.
 * @returns A promise that resolves with the response from the content script.
 */
async function sendMessageToContentScript<T extends BaseResponse>(tabId: number, message: ContentScriptRequest): Promise<T> {
    try {
        console.debug(`[Executor] Sending message to tab ${tabId}:`, message);
        // Use any type temporarily for the raw response from chrome API
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response: any = await chrome.tabs.sendMessage(tabId, message);
        console.debug(`[Executor] Received response from tab ${tabId}:`, response);

        // Check chrome.runtime.lastError FIRST, as it indicates fundamental communication errors
        if (chrome.runtime.lastError) {
             throw new Error(`Error sending message to tab ${tabId}: ${chrome.runtime.lastError.message}`);
        }

        // Check if a response was received at all (content script might not be listening)
        if (typeof response === 'undefined') {
            throw new Error(`No response received from content script in tab ${tabId}. Is it injected and listening?`);
        }

        // Perform runtime validation of the response structure before casting
        if (typeof response !== 'object' || response === null || typeof response.success !== 'boolean') {
             throw new Error(`Invalid response structure received from content script: ${JSON.stringify(response)}`);
        }

        // Check for application-level errors reported by the content script
        if (!response.success) {
            throw new Error(`Content script error: ${response.error || 'Unknown error'}`);
        }

        // If all checks pass, cast and return
        return response as T;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Executor] sendMessageToContentScript failed: ${errorMessage}`, error);
        // Rethrow a more specific error to be handled by the caller
        throw new Error(`Failed to communicate with content script: ${errorMessage}`);
    }
}

// --- Context for substitutions --- 
interface ExecutionContext {
    currentItem?: any; // For loops
    // Add other context variables if needed (e.g., results from previous steps)
}

/**
 * Helper function to substitute variables (like {{item}}) in text.
 */
function substituteVariables(text: string | undefined, context: ExecutionContext): string | undefined {
    if (!text) return undefined;
    let result = text;
    if (context.currentItem !== undefined && result.includes('{{item}}')) {
        // Simple substitution for now, might need more robust templating later
        const itemString = typeof context.currentItem === 'string' ? context.currentItem : JSON.stringify(context.currentItem);
        result = result.replace(/{{item}}/g, itemString);
    }
    // Add other variable substitutions here if needed
    return result;
}

/**
 * Waits for a specific tab to finish loading.
 * @param tabId The ID of the tab to wait for.
 * @param timeoutMs Maximum time to wait in milliseconds.
 * @returns A promise that resolves when the tab status is 'complete'.
 */
function waitForTabLoad(tabId: number, timeoutMs: number = 15000): Promise<void> {
    console.log(`[Executor] Waiting up to ${timeoutMs}ms for tab ${tabId} to complete loading...`);
    return new Promise((resolve, reject) => {
        let listener: ((updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => void) | null = null;
        let removedListener: ((removedTabId: number) => void) | null = null;
        let timeoutId: NodeJS.Timeout | null = null;

        const cleanup = () => {
            if (listener) {
                chrome.tabs.onUpdated.removeListener(listener);
                listener = null;
            }
             if (removedListener) {
                chrome.tabs.onRemoved.removeListener(removedListener);
                removedListener = null;
            }
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
        };

        timeoutId = setTimeout(() => {
            cleanup();
            console.error(`[Executor] Timeout waiting for tab ${tabId} to load.`);
            reject(new Error(`Timeout waiting for tab ${tabId} to complete loading.`));
        }, timeoutMs);

        listener = (updatedTabId, changeInfo) => {
            // Wait specifically for the 'complete' status
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
                console.log(`[Executor] Tab ${tabId} reported status 'complete'.`);
                cleanup();
                // Add a small safety delay to ensure content script is likely ready
                setTimeout(resolve, 100); 
            }
        };

        removedListener = (removedTabId) => {
            if (removedTabId === tabId) {
                cleanup();
                 console.error(`[Executor] Tab ${tabId} was closed before loading completed.`);
                reject(new Error(`Tab ${tabId} was closed before loading completed.`));
            }
        };

        // Check initial state *after* adding listeners, in case it loaded extremely fast
        chrome.tabs.get(tabId, (tab) => {
             if (chrome.runtime.lastError) {
                 // Tab might have closed even before we added the removed listener
                  cleanup();
                  reject(new Error(`Failed to get tab ${tabId} state: ${chrome.runtime.lastError.message}`));
             } else if (tab && tab.status === 'complete') {
                  console.log(`[Executor] Tab ${tabId} was already complete when checking.`);
                  cleanup();
                  // Add a small safety delay
                   setTimeout(resolve, 100); 
             } else {
                 // Only add listeners if not already complete/error
                 chrome.tabs.onUpdated.addListener(listener!);
                 chrome.tabs.onRemoved.addListener(removedListener!);
             }
        });
    });
}

/**
 * Recursively executes a sequence of workflow steps.
 * @param tabId The ID of the target tab.
 * @param steps The array of Step objects to execute.
 * @param context The current execution context (e.g., loop item).
 * @param stepPath A string representing the path for logging (e.g., "steps[5]/then[0]")
 */
async function executeWorkflowSteps(tabId: number, steps: Step[], context: ExecutionContext, stepPath: string): Promise<void> {
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const currentStepPath = `${stepPath}[${i}]`;
        console.log(`[Executor] Processing ${currentStepPath}:`, step);

        // --- TODO: Handle inline loop/condition attached *to* structural blocks? ---
        // The schema allows loop/condition on 'if' and 'loop' actions themselves.
        // Add logic here if needed to evaluate those before processing the action.

        try {
            switch (step.action) {
                case 'navigate':
                    // Handle navigate directly using chrome.tabs.update
                    const navigateStep = step as NavigateStep;
                    if (typeof navigateStep.value !== 'string' || !navigateStep.value) {
                        throw new Error(`Action 'navigate' requires a non-empty string 'value' (URL).`);
                    }
                    const targetUrl = substituteVariables(navigateStep.value, context);
                    if (!targetUrl) {
                        throw new Error(`Action 'navigate' resulted in an empty URL after variable substitution.`);
                    }
                    console.log(`[Executor] Executing action "navigate" to URL: ${targetUrl}`);
                    await chrome.tabs.update(tabId, { url: targetUrl });
                    console.log(`[Executor] Action "navigate" to ${targetUrl} initiated. Waiting for tab load...`);
                    // Wait for the tab to report 'complete' status
                    try {
                        await waitForTabLoad(tabId); 
                        console.log(`[Executor] Tab ${tabId} finished loading after navigation.`);
                    } catch (waitError) {
                         console.error(`[Executor] Error waiting for tab ${tabId} to load after navigation:`, waitError);
                         // Re-throw error to stop workflow execution
                         throw new Error(`Navigation to ${targetUrl} initiated, but failed while waiting for page load: ${waitError instanceof Error ? waitError.message : String(waitError)}`);
                    }
                    break;

                case 'waitForElement':
                    const waitStep = step as WaitForElementStep;
                    const waitSelector = substituteVariables(waitStep.selector, context);
                    if (!waitSelector) {
                        throw new Error(`Action 'waitForElement' requires a non-empty 'selector'.`);
                    }
                    const timeout = waitStep.timeout ?? 15000; // Use default from schema if not provided
                    console.log(`[Executor] Executing "waitForElement" for selector "${waitSelector}" (timeout: ${timeout}ms)`);

                    // Add a small initial delay before starting checks
                    await new Promise(resolve => setTimeout(resolve, 250)); 

                    const startTime = Date.now();
                    let elementFound = false;
                    while (Date.now() - startTime < timeout) {
                        try {
                            const checkMsg: CheckElementMessage = { 
                                type: 'CHECK_ELEMENT', 
                                payload: { selector: waitSelector } 
                            };
                            const response = await sendMessageToContentScript<{ success: boolean, exists: boolean }>(tabId, checkMsg);
                            if (response.exists) {
                                elementFound = true;
                                console.log(`[Executor] Element "${waitSelector}" found.`);
                                break; // Exit the while loop
                            }
                        } catch (error) {
                            // Ignore "failed to communicate" errors briefly after navigation, retry
                            if (error instanceof Error && error.message.includes('Failed to communicate')) {
                                console.warn(`[Executor] Communication error checking for element "${waitSelector}" (possibly temporary after nav), retrying...`);
                            } else {
                                // Rethrow other errors immediately
                                throw error;
                            }
                        }
                        // Wait before next check
                        await new Promise(resolve => setTimeout(resolve, 500)); 
                    }

                    if (!elementFound) {
                        throw new Error(`Timeout waiting for element "${waitSelector}" after ${timeout}ms.`);
                    }
                    break;

                case 'log':
                case 'wait':
                case 'click':
                case 'type':
                    // Simple actions
                    let actionSelector: string | undefined = undefined;
                    let actionValue: string | number | undefined = undefined; // Allow number for wait

                    // Substitute only if property exists on the step type
                    if ('selector' in step && step.selector) {
                        actionSelector = substituteVariables(step.selector, context);
                    }
                    if ('value' in step && typeof step.value !== 'undefined') {
                        // Handle wait step value separately as it's numeric
                        if (step.action === 'wait') {
                            actionValue = step.value;
                        } else {
                            actionValue = substituteVariables(String(step.value), context); // Ensure value is string before substitution
                        }
                    }

                    // Basic validation (could be enhanced)
                    if ((step.action === 'click' || step.action === 'type') && !actionSelector) {
                        throw new Error(`Action '${step.action}' requires a 'selector'.`);
                    }
                    if ((step.action === 'type' || step.action === 'log') && typeof actionValue === 'undefined') {
                         throw new Error(`Action '${step.action}' requires a 'value'.`);
                    }
                     if (step.action === 'wait' && typeof actionValue !== 'number') {
                        throw new Error(`Action 'wait' requires a numeric 'value' (milliseconds).`);
                     }

                    console.log(`[Executor] Executing action "${step.action}" for ${currentStepPath}`);
                    const actionPayload: ExecuteActionPayload = {
                        action: step.action,
                        selector: actionSelector,
                        value: actionValue 
                    };

                    await sendMessageToContentScript(tabId, { type: 'EXECUTE_ACTION', payload: actionPayload });
                    console.log(`[Executor] Action "${step.action}" for ${currentStepPath} completed.`);
                    break;

                case 'jsHatch':
                    // Assert step type
                    const jsHatchStep = step as JsHatchStep;
                    if (!jsHatchStep.code) {
                         throw new Error(`Action 'jsHatch' requires 'code'.`);
                    }
                    console.log(`[Executor] Executing action "jsHatch" for ${currentStepPath}`);
                    
                    // Safely substitute value and selector if they exist
                    let hatchValue: any = undefined;
                    if (typeof jsHatchStep.value !== 'undefined') {
                        hatchValue = substituteVariables(String(jsHatchStep.value), context);
                    }
                    const hatchSelector = substituteVariables(jsHatchStep.selector, context);

                    const hatchPayload: ExecuteJsHatchPayload = { 
                        code: jsHatchStep.code, 
                        value: hatchValue, // Pass potentially substituted value
                        selector: hatchSelector 
                    };
                    const hatchResponse = await sendMessageToContentScript(tabId, { type: 'EXECUTE_JS_HATCH', payload: hatchPayload });
                    console.log(`[Executor] Action "jsHatch" for ${currentStepPath} completed. Result:`, hatchResponse.data);
                    break;

                case 'if':
                    // Assert step type
                    const ifStep = step as IfStep;
                    
                    // ---- Remove DEBUG LOGGING ----
                    // console.log(...);
                    // ---- END DEBUG LOGGING ----
                    
                    // Use ifStep.condition (matches parser type and YAML structure)
                    if (!ifStep.condition || !ifStep.then) { 
                        throw new Error(`Action 'if' requires 'condition' and 'then' blocks.`);
                    }
                    console.log(`[Executor] Evaluating condition for ${currentStepPath}:`, ifStep.condition);

                    // Substitute variables using ifStep.condition
                    const conditionSelector = substituteVariables(ifStep.condition.selector, context);
                    const conditionEqualsValue = substituteVariables(ifStep.condition.equalsValue, context);

                    if (!ifStep.condition.conditionType || !conditionSelector) {
                         throw new Error(`'if' condition requires 'conditionType' and 'selector'.`);
                    }

                    const conditionPayload: CheckConditionPayload = {
                        conditionType: ifStep.condition.conditionType,
                        selector: conditionSelector,
                        equalsValue: conditionEqualsValue
                    };

                    let conditionMet = false;
                    // ---- REMOVE INNER TRY/CATCH ----
                    // try {
                    // ---- END REMOVE INNER TRY/CATCH ----
                    
                    // DEBUG: Log the payload being sent
                    console.log(`[Executor DEBUG] Sending CHECK_CONDITION payload for ${currentStepPath}:`, JSON.stringify(conditionPayload, null, 2)); 
                    
                    // Get the response
                    const checkResponse = await sendMessageToContentScript<{ success: boolean, data: { conditionMet: boolean }}> (
                        tabId,
                        { type: 'CHECK_CONDITION', payload: conditionPayload }
                    );
                    
                    // DEBUG: Log the response received
                    console.log(`[Executor DEBUG] Received CHECK_CONDITION response for ${currentStepPath}:`, JSON.stringify(checkResponse, null, 2));
                    
                    // Check response structure before accessing data (defensive coding)
                    if (!checkResponse || typeof checkResponse !== 'object' || !checkResponse.data) {
                        console.error(`[Executor] Invalid or missing response data for CHECK_CONDITION at ${currentStepPath}`, checkResponse);
                        throw new Error(`Invalid response received for condition check at ${currentStepPath}`);
                    }

                    // Assign conditionMet from the confirmed response
                    conditionMet = checkResponse.data.conditionMet;
                    console.log(`[Executor] Condition for ${currentStepPath} result: ${conditionMet}`);

                    // ---- REMOVE INNER CATCH ----
                    // } catch (err) {
                    //    console.error(`[Executor] Error checking condition for ${currentStepPath}:`, err);
                    //    throw err;
                    // }
                    // ---- END REMOVE INNER CATCH ----

                    // Execute then/else using ifStep.then / ifStep.else
                    if (conditionMet) {
                        console.log(`[Executor] Condition true, executing 'then' block for ${currentStepPath}`);
                        await executeWorkflowSteps(tabId, ifStep.then, context, `${currentStepPath}/then`);
                    } else if (ifStep.else) {
                        console.log(`[Executor] Condition false, executing 'else' block for ${currentStepPath}`);
                        await executeWorkflowSteps(tabId, ifStep.else, context, `${currentStepPath}/else`);
                    } else {
                        console.log(`[Executor] Condition false, no 'else' block for ${currentStepPath}`);
                    }
                    break;

                case 'loop':
                    // Assert step type
                    const loopStep = step as LoopStep;
                    if (!loopStep.forEach || !loopStep.do) {
                        throw new Error(`Action 'loop' requires 'forEach' and 'do' blocks.`);
                    }

                    let loopIterations = 0;
                    let loopItems: any[] | undefined = undefined;
                    let useItemsLoop = false;

                    if (Array.isArray(loopStep.forEach.in)) {
                        loopItems = loopStep.forEach.in;
                        loopIterations = loopItems.length;
                        useItemsLoop = true;
                        console.log(`[Executor] Looping over ${loopIterations} items for ${currentStepPath}`);
                    } else if (typeof loopStep.forEach.times === 'number' && loopStep.forEach.times >= 1) {
                        loopIterations = Math.floor(loopStep.forEach.times);
                        console.log(`[Executor] Looping ${loopIterations} times for ${currentStepPath}`);
                    } else {
                        throw new Error(`Action 'loop' requires 'forEach.in' (array) or 'forEach.times' (number).`);
                    }

                    for (let loopIndex = 0; loopIndex < loopIterations; loopIndex++) {
                        let currentItem: any;
                        // Check useItemsLoop AND assert loopItems is not undefined before accessing
                        if (useItemsLoop && typeof loopItems !== 'undefined') { 
                            currentItem = loopItems[loopIndex];
                        } else {
                            currentItem = loopIndex + 1; // Use 1-based index for 'times' loop
                        }
                        const loopContext = { ...context, currentItem };
                        console.log(`[Executor] Executing loop iteration ${loopIndex + 1}/${loopIterations} for ${currentStepPath}`);
                        await executeWorkflowSteps(tabId, loopStep.do, loopContext, `${currentStepPath}/do`);
                    }
                    break;

                default:
                    // This case should ideally not be reached if schema is enforced,
                    // but good for robustness.
                    console.warn(`[Executor] Encountered unknown action type "${(step as any).action}" in ${currentStepPath}. Skipping.`);
                    break;
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Log error with specific step path
            console.error(`[Executor] Error executing ${currentStepPath} (${step.action || 'unknown'}): ${errorMessage}`, error);
            // Re-throw error, adding step path information
            throw new Error(`Workflow failed at ${currentStepPath}: ${errorMessage}`);
        }
    } // End step loop
}

/**
 * Executes a workflow defined by the DSL.
 * @param tabId The ID of the tab where the workflow should be executed.
 * @param workflow The parsed Workflow object.
 */
export async function executeWorkflow(tabId: number, workflow: Workflow): Promise<void> {
    console.log(`[Executor] Starting workflow execution on tab ${tabId}`, workflow);
    try {
        await executeWorkflowSteps(tabId, workflow.steps, {}, 'steps');
        console.log(`[Executor] Workflow execution finished successfully for tab ${tabId}.`);
    } catch (error) {
        // Catch errors bubbled up from executeWorkflowSteps
        console.error(`[Executor] Workflow execution failed for tab ${tabId}.`, error);
        // Re-throw the final error so the caller knows the workflow failed
        throw error;
    }
} 
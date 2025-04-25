// src/dsl/executor.ts
/// <reference types="chrome" />

import { Workflow, Step, IfStep, LoopStep, JsHatchStep } from './parser'; // Assuming parser exports these types
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

type ContentScriptRequest = ExecuteActionMessage | CheckConditionMessage | ExecuteJsHatchMessage;

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
                case 'log':
                case 'wait':
                case 'click':
                case 'type':
                case 'navigate':
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
                    if ((step.action === 'type' || step.action === 'navigate' || step.action === 'log') && typeof actionValue === 'undefined') {
                         throw new Error(`Action '${step.action}' requires a 'value'.`);
                    }
                     if (step.action === 'wait' && typeof actionValue !== 'number') { // Check actionValue type now
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
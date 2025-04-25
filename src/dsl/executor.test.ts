import { executeWorkflow } from './executor';
import { loadDslFromYaml, Workflow } from './parser'; // Import Workflow type
import fs from 'fs';
import path from 'path';

// --- Mock Chrome API ---
// We need to properly type the mock to satisfy Jest and TypeScript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockChrome: {
    tabs: { sendMessage: jest.Mock<Promise<any>, [number, any, any?]> }; // More specific mock type
    runtime: { lastError?: { message?: string } };
} = {
    tabs: {
        sendMessage: jest.fn(),
    },
    runtime: {
        lastError: undefined,
    },
};

// Assign the mock to the global scope before tests run
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).chrome = mockChrome;

// --- Test Setup ---

// Define path constant, but loading happens in beforeEach
const yamlPath = path.resolve(process.cwd(), 'test/sample_workflow.yaml');
const testTabId = 123;

// Declare testWorkflow variable here, will be assigned in beforeEach
let testWorkflow: Workflow;

// Remove top-level loading
// let yamlContent: string;
// try {
//     yamlContent = fs.readFileSync(yamlPath, 'utf-8');
// } catch (e) { ... }
// const testWorkflow = loadDslFromYaml(yamlContent); // MOVED

// --- Test Suite ---
describe('DSL Executor', () => {

    beforeEach(() => {
        // Load the workflow from YAML before each test
        try {
            const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
            testWorkflow = loadDslFromYaml(yamlContent);
        } catch (e) {
            // Throw a specific error if loading fails during test setup
            throw new Error(`Failed to load test workflow YAML (${yamlPath}): ${e instanceof Error ? e.message : e}`);
        }

        // Reset mocks
        mockChrome.tabs.sendMessage.mockClear();
        mockChrome.tabs.sendMessage.mockResolvedValue({ success: true });
        mockChrome.runtime.lastError = undefined;
    });

    it('should execute the full sample workflow correctly, mocking responses', async () => {
        // Configure specific mock responses based on the sample workflow logic
        mockChrome.tabs.sendMessage.mockImplementation(async (_tabId, message) => {
            // Log every call
            console.log(`[Mock Call #${mockChrome.tabs.sendMessage.mock.calls.length}] Type: ${message.type}, Payload:`, message.payload);

            // Condition check for #input2 value (steps[5])
            if (message.type === 'CHECK_CONDITION' &&
                message.payload.conditionType === 'ifValue' &&
                message.payload.selector === '#input2' &&
                message.payload.equalsValue === 'proceed') {

                // Check if the 'type' action for #input2 (steps[5]/else[1]) has already been *sent*
                const typeInput2CallSent = mockChrome.tabs.sendMessage.mock.calls.some(call =>
                    call[1].type === 'EXECUTE_ACTION' &&
                    call[1].payload.action === 'type' &&
                    call[1].payload.selector === '#input2'
                );

                if (!typeInput2CallSent) { // Before typing 'proceed'
                     console.log('[Mock] Condition #input2 == "proceed" -> false');
                     return Promise.resolve({ success: true, data: { conditionMet: false } });
                } else { // After typing 'proceed' - This case won't be hit by sample.yaml
                     console.log('[Mock] Condition #input2 == "proceed" -> true');
                     return Promise.resolve({ success: true, data: { conditionMet: true } });
                }
            }
            // JS Hatch execution simulation (steps[8])
            else if (message.type === 'EXECUTE_JS_HATCH') {
                 console.log('[Mock] Executing JS Hatch: ', message.payload.code.substring(0, 50) + '...');
                 // Only one hatch in sample.yaml, assume it's the one creating the element
                 return Promise.resolve({ success: true, data: { status: 'ok', timestamp: Date.now() } }); // Simulate success
            }
            // Condition check for the 'hatch-created' element (steps[9])
            else if (message.type === 'CHECK_CONDITION' &&
                     message.payload.conditionType === 'ifExists' &&
                     message.payload.selector === "[data-test='hatch-created']") {
                // Check if the JS hatch (steps[8]) has been called
                 const hatchCallSent = mockChrome.tabs.sendMessage.mock.calls.some(call =>
                    call[1].type === 'EXECUTE_JS_HATCH'
                 );
                 if (hatchCallSent) {
                    console.log('[Mock] Condition [data-test=\'hatch-created\'] exists -> true');
                    return Promise.resolve({ success: true, data: { conditionMet: true } });
                 } else {
                     // This case shouldn't be hit in the normal flow of sample.yaml
                     console.log('[Mock] Condition [data-test=\'hatch-created\'] exists -> false (hatch not run)');
                     return Promise.resolve({ success: true, data: { conditionMet: false } });
                 }
            }
            // Default success for other actions (log, type, click, wait)
            console.log('[Mock] Default success response for:', message.type, message.payload?.action);
            return Promise.resolve({ success: true });
        });

        await executeWorkflow(testTabId, testWorkflow);

        // --- Assertions ---
        expect(mockChrome.tabs.sendMessage).toHaveBeenCalled();

        // Verify total calls match expected sequence based on actual sample_workflow.yaml
        const expectedTotalCalls = 27; // Recalculated based on YAML
        expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(expectedTotalCalls);

        const calls = mockChrome.tabs.sendMessage.mock.calls;
         // Access arguments using calls[index][argumentIndex]
        const getMessagePayload = (callIndex: number) => calls[callIndex]?.[1]?.payload;

        // --- Check sequence based on YAML ---
        // Steps 0-4: log, type #input1, wait 500, click #button1, wait 1000
        expect(getMessagePayload(0)).toEqual({ action: 'log', value: 'Starting the sample workflow.', selector: undefined });
        expect(getMessagePayload(1)).toEqual({ action: 'type', selector: '#input1', value: 'Initial text' });
        expect(getMessagePayload(2)).toEqual({ action: 'wait', selector: undefined, value: 500 });
        expect(getMessagePayload(3)).toEqual({ action: 'click', selector: '#button1', value: undefined });
        expect(getMessagePayload(4)).toEqual({ action: 'wait', selector: undefined, value: 1000 });

        // Step 5: if (#input2 == "proceed") -> check fails
        expect(calls[5]?.[1]?.type).toBe('CHECK_CONDITION');
        expect(getMessagePayload(5)?.selector).toBe('#input2');
        expect(getMessagePayload(5)?.equalsValue).toBe('proceed');
        // Mock returns { conditionMet: false }

        // Step 5 / else block: log, type, wait 300, click #conditionalButton
        expect(getMessagePayload(6)).toEqual({ action: 'log', value: "Condition not met, typing 'proceed'...", selector: undefined });
        expect(getMessagePayload(7)).toEqual({ action: 'type', selector: '#input2', value: 'proceed' });
        expect(getMessagePayload(8)).toEqual({ action: 'wait', selector: undefined, value: 300 }); // Uses value from YAML
        expect(getMessagePayload(9)).toEqual({ action: 'click', selector: '#conditionalButton', value: undefined });

        // Step 6: wait 500
        expect(getMessagePayload(10)).toEqual({ action: 'wait', selector: undefined, value: 500 });

        // Step 7: loop (3 iterations)
        // Iteration 1: log, type, click, wait 200
        expect(getMessagePayload(11)).toEqual({ action: 'log', value: 'Processing item: Apple', selector: undefined });
        expect(getMessagePayload(12)).toEqual({ action: 'type', selector: '#loopInput', value: 'Item: Apple' });
        expect(getMessagePayload(13)).toEqual({ action: 'click', selector: '#loopButton', value: undefined });
        expect(getMessagePayload(14)).toEqual({ action: 'wait', selector: undefined, value: 200 });
        // Iteration 2: log, type, click, wait 200
        expect(getMessagePayload(15)).toEqual({ action: 'log', value: 'Processing item: Banana', selector: undefined });
        expect(getMessagePayload(16)).toEqual({ action: 'type', selector: '#loopInput', value: 'Item: Banana' });
        expect(getMessagePayload(17)).toEqual({ action: 'click', selector: '#loopButton', value: undefined });
        expect(getMessagePayload(18)).toEqual({ action: 'wait', selector: undefined, value: 200 });
        // Iteration 3: log, type, click, wait 200
        expect(getMessagePayload(19)).toEqual({ action: 'log', value: 'Processing item: Cherry', selector: undefined });
        expect(getMessagePayload(20)).toEqual({ action: 'type', selector: '#loopInput', value: 'Item: Cherry' });
        expect(getMessagePayload(21)).toEqual({ action: 'click', selector: '#loopButton', value: undefined });
        expect(getMessagePayload(22)).toEqual({ action: 'wait', selector: undefined, value: 200 });

        // Step 8: jsHatch (create element)
        expect(calls[23]?.[1]?.type).toBe('EXECUTE_JS_HATCH');
        expect(getMessagePayload(23)?.code).toContain('appendChild');

        // Step 9: if (ifExists: "[data-test='hatch-created']") -> check passes
        expect(calls[24]?.[1]?.type).toBe('CHECK_CONDITION');
        expect(getMessagePayload(24)?.conditionType).toBe('ifExists');
        expect(getMessagePayload(24)?.selector).toBe("[data-test='hatch-created']");
        // Mock returns { conditionMet: true }

        // Step 9 / then block: log
        expect(getMessagePayload(25)).toEqual({ action: 'log', value: 'JS Hatch element found!', selector: undefined });

        // Step 10: log (final)
        expect(getMessagePayload(26)).toEqual({ action: 'log', value: 'Sample workflow finished.', selector: undefined });

    });

    it('should handle content script error response', async () => {
        mockChrome.tabs.sendMessage.mockImplementation(async (_tabId, message) => {
            if (message.type === 'EXECUTE_ACTION' && message.payload.action === 'click' && message.payload.selector === '#button1') {
                return Promise.resolve({ success: false, error: 'Simulated content script error' });
            }
            // Need to handle condition checks for the test to proceed to the failing step
            if (message.type === 'CHECK_CONDITION') {
                return Promise.resolve({ success: true, data: { conditionMet: false } }); // Assume initial condition fails
            }
            return Promise.resolve({ success: true });
        });

        // Steps: log, type, wait, click(fail) -> 4 calls
        await expect(executeWorkflow(testTabId, testWorkflow)).rejects.toThrow(
            /Workflow failed at steps\[3\].*Simulated content script error/
        );
        expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(4);
    });

     it('should handle chrome.runtime.lastError', async () => {
        mockChrome.tabs.sendMessage.mockImplementation(async () => {
             mockChrome.runtime.lastError = { message: 'Simulated runtime error' };
             // Simulate sendMessage returning undefined when lastError is set
             return Promise.resolve(undefined);
        });

        await expect(executeWorkflow(testTabId, testWorkflow)).rejects.toThrow(
            /Workflow failed at steps\[0\].*Failed to communicate with content script.*Simulated runtime error/
        );
         expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('should handle missing response from content script', async () => {
        mockChrome.tabs.sendMessage.mockResolvedValue(undefined);

        await expect(executeWorkflow(testTabId, testWorkflow)).rejects.toThrow(
             /Workflow failed at steps\[0\].*No response received from content script/
        );
        expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(1);
    });

     it('should handle invalid response structure from content script', async () => {
        mockChrome.tabs.sendMessage.mockResolvedValue({ notSuccess: true }); // Missing 'success'

        await expect(executeWorkflow(testTabId, testWorkflow)).rejects.toThrow(
             /Workflow failed at steps\[0\].*Invalid response structure received/
        );
        expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(1);
    });

     it('should skip step with unknown action type', async () => {
         const workflowWithUnknownAction: Workflow = {
             steps: [
                 { action: 'log', value: 'Step 1' },
                 { action: 'unknownAction', selector: '#id' } as any, 
                 { action: 'log', value: 'Step 3' },
             ]
         };

         // Mock needs to handle the log actions
         mockChrome.tabs.sendMessage.mockResolvedValue({ success: true });

         await executeWorkflow(testTabId, workflowWithUnknownAction);

         // Should call log, skip unknown, call log
         expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(2);
         expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(testTabId,
             expect.objectContaining({ type: 'EXECUTE_ACTION', payload: expect.objectContaining({ action: 'log', value: 'Step 1' }) })
         );
         expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(testTabId,
             expect.objectContaining({ type: 'EXECUTE_ACTION', payload: expect.objectContaining({ action: 'log', value: 'Step 3' }) })
         );
         // Verify it wasn't called with 'unknownAction'
          expect(mockChrome.tabs.sendMessage).not.toHaveBeenCalledWith(testTabId,
             expect.objectContaining({ payload: expect.objectContaining({ action: 'unknownAction' }) })
         );
     });

     it('should throw error if required fields are missing for an action', async () => {
        const invalidWorkflow: Workflow = { steps: [{ action: 'click' } as any] };
        await expect(executeWorkflow(testTabId, invalidWorkflow)).rejects.toThrow(
            /Workflow failed at steps\[0\].*Action 'click' requires a 'selector'/
        );
        expect(mockChrome.tabs.sendMessage).not.toHaveBeenCalled(); // Validation fails before sending message
     });

}); 
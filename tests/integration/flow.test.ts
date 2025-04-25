import { handleRunWorkflow } from '../../src/background/handler'; // ASSUMED Refactored handler import
import { parseIntent } from '../../src/llm/IntentParser';
import { executeWorkflow } from '../../src/dsl/executor';
import { Workflow } from '../../src/dsl/parser';

// --- Mocks ---

// Mock the modules
jest.mock('../../src/llm/IntentParser');
jest.mock('../../src/dsl/executor');

// Mock Chrome APIs (using a simplified structure)
const mockChrome = {
  tabs: {
    query: jest.fn(),
    // Add other necessary tab functions if needed by the handler
  },
  runtime: {
    sendMessage: jest.fn(), // Not directly used by handler, but maybe by dependencies
    lastError: undefined, // Important for error checking
    // onMessage: { // Listener itself is not called directly in this test approach
    //   addListener: jest.fn(),
    //   removeListener: jest.fn(),
    //   hasListener: jest.fn(),
    // },
  },
  // Add other chrome namespaces if needed (e.g., storage)
};
// Assign the mock to the global scope (common Jest pattern for Chrome APIs)
Object.assign(global, { chrome: mockChrome });

// Type assertion for mocked functions
const mockedParseIntent = parseIntent as jest.MockedFunction<typeof parseIntent>;
const mockedExecuteWorkflow = executeWorkflow as jest.MockedFunction<typeof executeWorkflow>;

// --- Test Suite ---

describe('Background Script RUN_WORKFLOW Handler', () => {
  let mockSendResponse: jest.Mock;
  const mockPrompt = 'test prompt: go to example.com';
  const mockWorkflow: Workflow = { // Simple mock workflow
    steps: [{ action: 'navigate', value: 'https://example.com' }],
  };
  const mockTabId = 123;
  const mockTabs = [{ id: mockTabId }];

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockChrome.runtime.lastError = undefined; // Reset lastError
    mockSendResponse = jest.fn(); // Create a fresh mock response function
  });

  // --- Test Cases ---

  test('should execute workflow successfully and call sendResponse with success', async () => {
    // Arrange
    mockedParseIntent.mockResolvedValue(mockWorkflow);
    mockChrome.tabs.query.mockResolvedValue(mockTabs);
    mockedExecuteWorkflow.mockResolvedValue(undefined); // Resolves successfully

    const message = { type: 'RUN_WORKFLOW', prompt: mockPrompt };

    // Act
    await handleRunWorkflow(message, mockSendResponse); // Await the assumed handler

    // Assert
    expect(mockedParseIntent).toHaveBeenCalledWith(mockPrompt);
    expect(mockChrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(mockedExecuteWorkflow).toHaveBeenCalledWith(mockTabId, mockWorkflow);
    expect(mockSendResponse).toHaveBeenCalledTimes(1);
    expect(mockSendResponse).toHaveBeenCalledWith({
      success: true,
      message: expect.stringContaining('Workflow executed successfully'), // Or match exact message
    });
  });

  test('should call sendResponse with error if parseIntent fails', async () => {
    // Arrange
    const parseError = new Error('LLM unavailable');
    mockedParseIntent.mockRejectedValue(parseError);

    const message = { type: 'RUN_WORKFLOW', prompt: mockPrompt };

    // Act
    await handleRunWorkflow(message, mockSendResponse);

    // Assert
    expect(mockedParseIntent).toHaveBeenCalledWith(mockPrompt);
    expect(mockChrome.tabs.query).not.toHaveBeenCalled();
    expect(mockedExecuteWorkflow).not.toHaveBeenCalled();
    expect(mockSendResponse).toHaveBeenCalledTimes(1);
    expect(mockSendResponse).toHaveBeenCalledWith({
      success: false,
      error: expect.stringContaining('parsing: LLM unavailable'),
    });
  });

  test('should call sendResponse with error if no active tab is found', async () => {
    // Arrange
    mockedParseIntent.mockResolvedValue(mockWorkflow);
    mockChrome.tabs.query.mockResolvedValue([]); // No tabs found

    const message = { type: 'RUN_WORKFLOW', prompt: mockPrompt };

    // Act
    await handleRunWorkflow(message, mockSendResponse);

    // Assert
    expect(mockedParseIntent).toHaveBeenCalledWith(mockPrompt);
    expect(mockChrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(mockedExecuteWorkflow).not.toHaveBeenCalled();
    expect(mockSendResponse).toHaveBeenCalledTimes(1);
    expect(mockSendResponse).toHaveBeenCalledWith({
      success: false,
      error: expect.stringContaining('getting tab: No active tab found'), // Check error message
    });
  });

   test('should call sendResponse with error if chrome.tabs.query throws', async () => {
    // Arrange
    const queryError = new Error('Tabs API error');
    mockedParseIntent.mockResolvedValue(mockWorkflow);
    mockChrome.tabs.query.mockRejectedValue(queryError); // Tabs query fails

    const message = { type: 'RUN_WORKFLOW', prompt: mockPrompt };

    // Act
    await handleRunWorkflow(message, mockSendResponse);

    // Assert
    expect(mockedParseIntent).toHaveBeenCalledWith(mockPrompt);
    expect(mockChrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(mockedExecuteWorkflow).not.toHaveBeenCalled();
    expect(mockSendResponse).toHaveBeenCalledTimes(1);
    expect(mockSendResponse).toHaveBeenCalledWith({
      success: false,
      error: expect.stringContaining('getting tab: Tabs API error'), // Or however the actual error is propagated
    });
  });

  test('should call sendResponse with error if executeWorkflow fails', async () => {
    // Arrange
    const executeError = new Error('Element not found');
    mockedParseIntent.mockResolvedValue(mockWorkflow);
    mockChrome.tabs.query.mockResolvedValue(mockTabs);
    mockedExecuteWorkflow.mockRejectedValue(executeError); // Execution fails

    const message = { type: 'RUN_WORKFLOW', prompt: mockPrompt };

    // Act
    await handleRunWorkflow(message, mockSendResponse);

    // Assert
    expect(mockedParseIntent).toHaveBeenCalledWith(mockPrompt);
    expect(mockChrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(mockedExecuteWorkflow).toHaveBeenCalledWith(mockTabId, mockWorkflow);
    expect(mockSendResponse).toHaveBeenCalledTimes(1);
    expect(mockSendResponse).toHaveBeenCalledWith({
      success: false,
      error: expect.stringContaining('execution: Element not found'),
    });
  });

}); 
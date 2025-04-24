import '@testing-library/jest-dom';
import 'web-streams-polyfill'; // Use main entry point
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder for Jest environment (needed by LangChain/dependencies)
Object.assign(global, { TextDecoder, TextEncoder });

// No need to manually mock window or document when using testEnvironment: 'jsdom'
// jsdom provides these globals automatically.

// Add any other global test setup here if needed

// Example: If you need to mock specific browser APIs not provided by jsdom
// Object.defineProperty(window, 'localStorage', { value: mockLocalStorage }); 
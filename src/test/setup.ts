import '@testing-library/jest-dom';

// No need to manually mock window or document when using testEnvironment: 'jsdom'
// jsdom provides these globals automatically.

// Add any other global test setup here if needed

// Example: If you need to mock specific browser APIs not provided by jsdom
// Object.defineProperty(window, 'localStorage', { value: mockLocalStorage }); 
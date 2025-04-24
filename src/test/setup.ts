import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Mock document and window for tests
Object.defineProperty(window, 'document', {
    value: {
        ...window.document,
        addEventListener: jest.fn(),
    },
    writable: true,
});

// Add any global test setup here
Object.defineProperty(global, 'document', {
    value: {
        querySelector: jest.fn(),
    },
    writable: true,
});

Object.defineProperty(global, 'window', {
    value: {
        location: {
            href: '',
        },
    },
    writable: true,
});

// Mock querySelector
document.querySelector = jest.fn(); 
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { click, type, navigate } from './actions';

// Mock element
const mockElement = {
    dispatchEvent: jest.fn(),
    focus: jest.fn(),
    value: '',
};

const mockDocument = {
    querySelector: jest.fn(),
};

const mockWindow = {
    location: {
        href: '',
    },
};

// Replace globals with mocks
Object.defineProperty(global, 'document', {
    value: mockDocument,
    writable: true,
});

Object.defineProperty(global, 'window', {
    value: mockWindow,
    writable: true,
});

describe('Browser Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (document.querySelector as jest.Mock).mockReset();
        window.location.href = '';
    });

    describe('click', () => {
        it('should throw error if element not found', async () => {
            (document.querySelector as jest.Mock).mockReturnValue(null);
            await expect(click('#nonexistent')).rejects.toThrow('Element not found: #nonexistent');
        });

        it('should dispatch mouse events in sequence', async () => {
            (document.querySelector as jest.Mock).mockReturnValue(mockElement);
            await click('#button');
            
            expect(mockElement.dispatchEvent).toHaveBeenCalledTimes(4);
            expect(mockElement.dispatchEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: 'mouseover' }));
            expect(mockElement.dispatchEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: 'mousedown' }));
            expect(mockElement.dispatchEvent).toHaveBeenNthCalledWith(3, expect.objectContaining({ type: 'mouseup' }));
            expect(mockElement.dispatchEvent).toHaveBeenNthCalledWith(4, expect.objectContaining({ type: 'click' }));
        });
    });

    describe('type', () => {
        it('should throw error if element not found', async () => {
            (document.querySelector as jest.Mock).mockReturnValue(null);
            await expect(type('#nonexistent', 'text')).rejects.toThrow('Element not found: #nonexistent');
        });

        it('should set value and dispatch events', async () => {
            (document.querySelector as jest.Mock).mockReturnValue(mockElement);
            await type('#input', 'test text');
            
            expect(mockElement.focus).toHaveBeenCalled();
            expect(mockElement.value).toBe('test text');
            expect(mockElement.dispatchEvent).toHaveBeenCalledTimes(2);
            expect(mockElement.dispatchEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: 'input' }));
            expect(mockElement.dispatchEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: 'change' }));
        });
    });

    describe('navigate', () => {
        it('should change window location', async () => {
            await navigate('https://example.com');
            expect(window.location.href).toBe('https://example.com');
        });
    });
}); 
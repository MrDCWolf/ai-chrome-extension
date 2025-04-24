import { click, type, navigate } from '../src/content/actions';

describe('content actions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('click', () => {
    it('fires click event on the element', async () => {
      const div = document.createElement('div');
      div.id = 'test-div';
      document.body.appendChild(div);
      const clickSpy = jest.fn();
      div.addEventListener('click', clickSpy);
      await click('#test-div');
      expect(clickSpy).toHaveBeenCalled();
    });

    it('throws if element not found', async () => {
      await expect(click('#notfound')).rejects.toThrow('Element not found: #notfound');
    });
  });

  describe('type', () => {
    it('sets value and fires input event', async () => {
      const input = document.createElement('input');
      input.id = 'test-input';
      document.body.appendChild(input);
      const inputSpy = jest.fn();
      input.addEventListener('input', inputSpy);
      await type('#test-input', 'hello');
      expect(input.value).toBe('hello');
      expect(inputSpy).toHaveBeenCalled();
    });

    it('throws if input element not found', async () => {
      await expect(type('#notfound', 'fail')).rejects.toThrow('Element not found: #notfound');
    });
  });

  describe('navigate', () => {
    it('attempts to set window.location.href', async () => {
      const originalLocation = window.location;

      const locationDescriptor = {
        writable: true,
        value: { ...originalLocation, href: 'http://localhost/' }
      };
      Object.defineProperty(window, 'location', locationDescriptor);

      const hrefSetter = jest.fn();
      Object.defineProperty(window.location, 'href', {
        set: hrefSetter,
        get: () => locationDescriptor.value.href
      });

      await navigate('https://example.com');
      expect(hrefSetter).toHaveBeenCalledWith('https://example.com');

      Object.defineProperty(window, 'location', {
          writable: true,
          value: originalLocation
      });
    });
  });
}); 
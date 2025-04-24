test('jsdom works', () => {
  expect(typeof window.document.addEventListener).toBe('function');
}); 
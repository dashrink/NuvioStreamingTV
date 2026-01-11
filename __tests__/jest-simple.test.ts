/**
 * Simple Jest verification test
 * This test verifies that Jest itself is working correctly
 */

describe('Jest Configuration', () => {
  it('should run simple tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should support TypeScript', () => {
    const message: string = 'Hello, Jest!';
    expect(message).toBe('Hello, Jest!');
  });

  it('should support async tests', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });
});

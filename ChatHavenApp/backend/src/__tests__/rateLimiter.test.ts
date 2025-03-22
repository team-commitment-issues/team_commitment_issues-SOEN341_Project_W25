// tests/utils/rateLimiter.test.ts
import { RateLimiter } from '../utils/rateLimiter';
import { createLogger } from '../utils/logger';

// Mock the logger module
jest.mock('../utils/logger', () => {
  const mockWarnFn = jest.fn();
  const mockInfoFn = jest.fn();
  const mockDebugFn = jest.fn();
  const mockErrorFn = jest.fn();

  return {
    createLogger: jest.fn().mockReturnValue({
      warn: mockWarnFn,
      info: mockInfoFn,
      debug: mockDebugFn,
      error: mockErrorFn
    }),
    __mocks__: {
      mockWarnFn,
      mockInfoFn,
      mockDebugFn,
      mockErrorFn
    }
  };
});

// Import the mock functions for use in tests
const { __mocks__ } = jest.requireMock('../utils/logger');
const { mockWarnFn, mockInfoFn, mockDebugFn, mockErrorFn } = __mocks__;

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    jest.useFakeTimers();

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create rate limiter with small window for testing
    rateLimiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 1000, // 1 second window
      verbose: false
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should allow requests within the limit', () => {
    const clientId = 'test-client';

    // Make requests up to the limit
    for (let i = 0; i < 5; i++) {
      expect(rateLimiter.isAllowed(clientId)).toBe(true);
    }
  });

  test('should block requests that exceed the limit', () => {
    const clientId = 'test-client';

    // Make requests up to the limit
    for (let i = 0; i < 5; i++) {
      expect(rateLimiter.isAllowed(clientId)).toBe(true);
    }

    // Next request should be blocked
    expect(rateLimiter.isAllowed(clientId)).toBe(false);
  });

  test('should reset limit after the time window', () => {
    const clientId = 'test-client';

    // Make requests up to the limit
    for (let i = 0; i < 5; i++) {
      expect(rateLimiter.isAllowed(clientId)).toBe(true);
    }

    // Next request should be blocked
    expect(rateLimiter.isAllowed(clientId)).toBe(false);

    // Advance time past the window
    jest.advanceTimersByTime(1100);

    // Should be allowed again
    expect(rateLimiter.isAllowed(clientId)).toBe(true);
  });

  test('should track different clients separately', () => {
    const client1 = 'client-1';
    const client2 = 'client-2';

    // Make requests for client1 up to the limit
    for (let i = 0; i < 5; i++) {
      expect(rateLimiter.isAllowed(client1)).toBe(true);
    }

    // Client1 should be blocked
    expect(rateLimiter.isAllowed(client1)).toBe(false);

    // Client2 should still be allowed
    expect(rateLimiter.isAllowed(client2)).toBe(true);
  });

  test('should clean up expired trackers', () => {
    const client1 = 'client-1';
    const client2 = 'client-2';

    // Make requests for both clients
    expect(rateLimiter.isAllowed(client1)).toBe(true);
    expect(rateLimiter.isAllowed(client2)).toBe(true);

    // Access private trackers map through type casting
    const trackers = (rateLimiter as any).trackers as Map<string, any>;

    expect(trackers.has(client1)).toBe(true);
    expect(trackers.has(client2)).toBe(true);

    // Advance time past the cleanup interval (windowMs * 2)
    jest.advanceTimersByTime(2100);

    // Trigger cleanup by making a new request
    expect(rateLimiter.isAllowed('client-3')).toBe(true);

    // The old trackers should be cleaned up
    expect(trackers.has(client1)).toBe(false);
    expect(trackers.has(client2)).toBe(false);
  });

  test('should keep blocking if repeatedly attempting after limit', () => {
    const clientId = 'test-client';

    // Make requests up to the limit
    for (let i = 0; i < 5; i++) {
      expect(rateLimiter.isAllowed(clientId)).toBe(true);
    }

    // Make multiple attempts that exceed the limit
    expect(rateLimiter.isAllowed(clientId)).toBe(false);
    expect(rateLimiter.isAllowed(clientId)).toBe(false);
    expect(rateLimiter.isAllowed(clientId)).toBe(false);

    // Advance time past the window
    jest.advanceTimersByTime(1100);

    // Should be allowed again
    expect(rateLimiter.isAllowed(clientId)).toBe(true);
  });

  test('should log warnings when verbose mode is enabled', () => {
    // Clear any previous calls to the mock
    mockWarnFn.mockClear();

    // Create new rate limiter with verbose mode
    const verboseRateLimiter = new RateLimiter({
      maxRequests: 3,
      windowMs: 1000,
      verbose: true
    });

    const clientId = 'verbose-client';

    // Make requests up to the limit
    for (let i = 0; i < 3; i++) {
      expect(verboseRateLimiter.isAllowed(clientId)).toBe(true);
    }

    // Exceed the limit
    expect(verboseRateLimiter.isAllowed(clientId)).toBe(false);

    // Verify warning was logged using our directly accessible mock function
    expect(mockWarnFn).toHaveBeenCalledWith('Rate limit exceeded', expect.any(Object));
  });
});
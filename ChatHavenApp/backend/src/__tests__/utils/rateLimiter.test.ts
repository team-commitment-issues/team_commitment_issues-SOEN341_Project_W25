// tests/utils/rateLimiter.test.ts
import {
  RateLimiter,
  shutdownDefaultRateLimiter,
  setLogger,
  defaultRateLimiter
} from '../../utils/rateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  // Create mock logger functions
  const mockLogger = {
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn()
  };

  // Set up mocks before all tests
  beforeAll(() => {
    // Inject our mock logger into the RateLimiter module
    setLogger(mockLogger);
  });

  beforeEach(() => {
    jest.useFakeTimers();

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Clear all mock functions
    mockLogger.warn.mockClear();
    mockLogger.info.mockClear();
    mockLogger.debug.mockClear();
    mockLogger.error.mockClear();

    // Create rate limiter with small window for testing
    rateLimiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 1000, // 1 second window
      verbose: false
    });
  });

  afterEach(() => {
    // Clean up the rate limiter to prevent open handles
    rateLimiter.shutdown();
    jest.useRealTimers();
  });

  // After all tests, make sure to shut down any singleton instances
  afterAll(() => {
    shutdownDefaultRateLimiter();
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
    // Create a new rate limiter with verbose mode ENABLED
    const verboseRateLimiter = new RateLimiter({
      maxRequests: 3,
      windowMs: 1000,
      verbose: true // This is crucial!
    });

    const clientId = 'verbose-client';

    // Make requests up to the limit
    for (let i = 0; i < 3; i++) {
      verboseRateLimiter.isAllowed(clientId);
    }

    // At this point we've made exactly the max number of requests
    // Let's verify no warning has been logged yet
    expect(mockLogger.warn).not.toHaveBeenCalled();

    // Exceed the limit - this should trigger the warning
    verboseRateLimiter.isAllowed(clientId);

    // Now verify the warning was logged
    expect(mockLogger.warn).toHaveBeenCalledWith('Rate limit exceeded', expect.any(Object));

    // Clean up this rate limiter
    verboseRateLimiter.shutdown();
  });

  test('defaultRateLimiter should function as a singleton', () => {
    // Test that the default rate limiter can be used directly
    const clientId = 'default-client';

    // Should be able to call isAllowed() directly on the defaultRateLimiter
    expect(defaultRateLimiter.isAllowed(clientId)).toBe(true);

    // Should also work when called directly on the instance
    expect(defaultRateLimiter.isAllowed(clientId)).toBe(true);
  });
});

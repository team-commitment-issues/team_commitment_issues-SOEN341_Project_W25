// tests/utils/metrics.test.ts
import WebSocketMetrics from '../../utils/metrics';
import { WebSocketServer } from 'ws';
import { createLogger } from '../../utils/logger';

// Mock WebSocketServer
jest.mock('ws', () => {
  return {
    WebSocketServer: jest.fn().mockImplementation(() => {
      return {
        clients: new Set(),
        on: jest.fn(),
        close: jest.fn()
      };
    }),
    OPEN: 1
  };
});

// Mock the logger module before importing WebSocketMetrics
jest.mock('../utils/logger', () => {
  // Create mock functions
  const infoMock = jest.fn();
  const debugMock = jest.fn();
  const errorMock = jest.fn();
  const warnMock = jest.fn();

  // Return the mock implementation
  return {
    createLogger: jest.fn().mockReturnValue({
      info: infoMock,
      debug: debugMock,
      error: errorMock,
      warn: warnMock
    })
  };
});

// Mock os module
jest.mock('os', () => ({
  totalmem: jest.fn().mockReturnValue(16000000000), // 16GB
  freemem: jest.fn().mockReturnValue(8000000000),   // 8GB
  loadavg: jest.fn().mockReturnValue([1.5, 1.2, 1.0])
}));

describe('WebSocketMetrics', () => {
  let metrics: WebSocketMetrics;
  let mockWss: WebSocketServer;
  let mockLogger: any;

  beforeEach(() => {
    jest.useFakeTimers();

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Get the mock logger instance
    mockLogger = (createLogger as jest.Mock)();

    // Create mock WebSocketServer
    mockWss = new WebSocketServer();

    // Create metrics instance
    metrics = new WebSocketMetrics(mockWss);

    // Clear any scheduled timers
    jest.clearAllTimers();
  });

  afterEach(() => {
    // Stop metrics to clear intervals
    metrics.stop();

    // Restore timers
    jest.useRealTimers();
  });

  test('should track connections', () => {
    // Track some connections
    metrics.trackConnection();
    metrics.trackConnection();
    metrics.trackConnection();

    // Get metrics
    const data = metrics.getMetrics();

    // Verify connection counts
    expect(data.connections.total).toBe(3);
  });

  test('should track messages received and sent', () => {
    // Track some messages
    metrics.trackMessageReceived('message', 100);
    metrics.trackMessageReceived('join', 50);
    metrics.trackMessageSent(200);

    // Get metrics
    const data = metrics.getMetrics();

    // Verify message counts
    expect(data.messages.totals.messagesReceived).toBe(2);
    expect(data.messages.totals.messagesSent).toBe(1);
    expect(data.messages.totals.total).toBe(3);
  });

  test('should track message sizes', () => {
    // Track some messages with sizes
    metrics.trackMessageReceived('message', 100);
    metrics.trackMessageReceived('message', 200);
    metrics.trackMessageSent(300);

    // Get metrics
    const data = metrics.getMetrics();

    // Verify message size metrics
    expect(data.messages.sizes.totalBytes).toBe(600);
    expect(data.messages.sizes.averageSize).toBe(200);
    expect(data.messages.sizes.maxSize).toBe(300);
    expect(data.messages.sizes.minSize).toBe(100);
  });

  test('should track message types', () => {
    // Track different message types
    metrics.trackMessageReceived('join', 100);
    metrics.trackMessageReceived('message', 200);
    metrics.trackMessageReceived('directMessage', 300);
    metrics.trackMessageReceived('message', 150);

    // Get metrics
    const data = metrics.getMetrics();

    // Verify message type counts
    expect(data.messages.messageTypes.uniqueTypes).toBeGreaterThan(0);

    // Find the message type 'message' in topMessageTypes
    const messageTypeEntry = data.messages.messageTypes.topMessageTypes.find(
      ([type]: [string, number]) => type === 'message'
    );

    expect(messageTypeEntry).toBeDefined();
    expect(messageTypeEntry[1]).toBe(2); // Count of 'message' type
  });

  test('should track errors', () => {
    // Track some errors
    metrics.trackError('auth');
    metrics.trackError('connection');
    metrics.trackError('auth');

    // Get metrics
    const data = metrics.getMetrics();

    // Verify error count
    expect(data.errors).toBe(3);

    // Find the error type 'auth' in message types
    const errorTypeEntry = data.messages.messageTypes.topMessageTypes.find(
      ([type]: [string, number]) => type === 'error:auth'
    );

    expect(errorTypeEntry).toBeDefined();
    expect(errorTypeEntry[1]).toBe(2); // Count of 'auth' errors
  });

  test('should track latency', () => {
    // Track some latency values
    metrics.trackLatency(50);
    metrics.trackLatency(100);
    metrics.trackLatency(75);

    // Get metrics
    const data = metrics.getMetrics();

    // Verify latency metrics
    expect(data.messages.latency.averageMs).toBe(75);
    expect(data.messages.latency.maxMs).toBe(100);
    expect(data.messages.latency.minMs).toBe(50);
  });

  test('should take hourly snapshots', () => {
    // Track some data
    metrics.trackConnection();
    metrics.trackMessageReceived('message', 100);

    // We now know the class takes an initial snapshot in the constructor
    // So we should have 1 snapshot already

    // Add another snapshot to verify the interval logic
    metrics.takeHourlySnapshot();

    // Get metrics
    const data = metrics.getMetrics();

    // Verify at least 1 snapshot exists
    expect(data.trends.hourlyData.length).toBeGreaterThanOrEqual(1);

    // Verify latest snapshot has our tracked data
    const latestSnapshot = data.trends.hourlyData[data.trends.hourlyData.length - 1];
    expect(latestSnapshot.messagesReceived).toBe(1);
  });

  test('should report metrics periodically', () => {
    // Clear previous calls to avoid interference
    jest.clearAllMocks();

    // Manually call reportMetrics to test
    metrics.reportMetrics();

    // Verify that the logger.info method was called with the expected arguments
    expect(mockLogger.info).toHaveBeenCalledWith('WebSocket server metrics', expect.any(Object));
  });

  test('should include system metrics', () => {
    // Get metrics
    const data = metrics.getMetrics();

    // Verify system metrics
    expect(data.system).toBeDefined();
    expect(data.system.memoryUsage).toBeDefined();
    expect(data.system.cpuLoad).toBeDefined();
    expect(data.system.systemMemory).toBeDefined();
    expect(data.system.systemMemory.total).toBe(16000000000);
    expect(data.system.systemMemory.free).toBe(8000000000);
  });

  test('should format uptime correctly', () => {
    // Use a more reliable approach for mocking Date.now
    const originalDateNow = Date.now;
    const startTime = 1000000;

    // Mock Date.now for the entire test
    jest.spyOn(global.Date, 'now').mockImplementation(() => startTime);

    // Create new metrics instance (will use our mocked startTime)
    const timeMetrics = new WebSocketMetrics(mockWss);

    // Now change the mock to return a different time for getMetrics
    jest.spyOn(global.Date, 'now').mockImplementation(() => startTime + 90061000);

    // Get metrics
    const data = timeMetrics.getMetrics();

    // Restore original Date.now
    jest.spyOn(global.Date, 'now').mockRestore();

    // Verify uptime formatting
    expect(data.uptime.seconds).toBe(90061);
    expect(data.uptime.formatted).toBe('1d 1h 1m 1s');

    // Clean up
    timeMetrics.stop();
  });
});
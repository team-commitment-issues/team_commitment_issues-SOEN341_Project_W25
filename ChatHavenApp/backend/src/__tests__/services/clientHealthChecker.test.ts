// tests/services/clientHealthChecker.test.ts
import ClientHealthChecker from '../../services/clientHealthChecker';
import { WebSocketServer, WebSocket } from 'ws';
import { ExtendedWebSocket } from '../../types/websocket';

// Mock dependencies
jest.mock('ws');

// Mock the logger module
jest.mock('../../utils/logger', () => {
  const mockInfo = jest.fn();
  const mockError = jest.fn();
  const mockWarn = jest.fn();
  const mockDebug = jest.fn();

  return {
    createLogger: jest.fn().mockReturnValue({
      info: mockInfo,
      error: mockError,
      warn: mockWarn,
      debug: mockDebug,
    }),
    __mocks__: { mockInfo, mockError, mockWarn, mockDebug },
  };
});

// Import the mocked logger functions
const { __mocks__: { mockInfo, mockError, mockWarn, mockDebug } } = require('../../utils/logger');

describe('ClientHealthChecker', () => {
  let healthChecker: ClientHealthChecker;
  let mockWss: WebSocketServer;
  let mockClients: Set<any>;
  let originalSetInterval: typeof global.setInterval;
  let originalClearInterval: typeof global.clearInterval;
  let mockSetInterval: jest.Mock;
  let mockClearInterval: jest.Mock;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Store original timer functions
    originalSetInterval = global.setInterval;
    originalClearInterval = global.clearInterval;

    // Create proper Jest mocks for timer functions
    mockSetInterval = jest.fn().mockReturnValue(123);
    mockClearInterval = jest.fn();

    // Replace global timer functions with mocks
    global.setInterval = mockSetInterval as unknown as typeof global.setInterval;
    global.clearInterval = mockClearInterval as unknown as typeof global.clearInterval;

    // Set up mock WebSocketServer
    mockClients = new Set();
    mockWss = {
      clients: mockClients,
      on: jest.fn(),
      close: jest.fn(),
    } as unknown as WebSocketServer;

    // Create health checker with short intervals for testing
    healthChecker = new ClientHealthChecker(mockWss, 1000, 500);
  });

  afterEach(() => {
    // Stop health checker to clear intervals
    healthChecker.stop();

    // Restore original timer functions
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
  });

  test('should start and stop ping interval', () => {
    // Start health checker
    healthChecker.start();

    // Should have set up an interval
    expect(mockSetInterval).toHaveBeenCalled();
    expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 1000);

    // Stop health checker
    healthChecker.stop();

    // Should have cleared the interval
    expect(mockClearInterval).toHaveBeenCalled();
    expect(mockClearInterval).toHaveBeenCalledWith(123);
  });

  test('should set up client for health checking', () => {
    // Create mock client with properly typed jest functions
    const mockOn = jest.fn();
    const mockClient = {
      on: mockOn,
      ping: jest.fn(),
      user: { username: 'testuser' },
      sessionId: 'test-session'
    } as unknown as ExtendedWebSocket;

    // Set up client
    healthChecker.setupClient(mockClient);

    // Should have set isAlive flag
    expect(mockClient.isAlive).toBe(true);

    // Should have registered pong handler
    expect(mockOn).toHaveBeenCalledWith('pong', expect.any(Function));
  });

  test('should handle pong responses', () => {
    // Create mock client with properly typed jest functions
    const mockOn = jest.fn();
    const mockClient = {
      on: mockOn,
      ping: jest.fn(),
      user: { username: 'testuser' },
      sessionId: 'test-session'
    } as unknown as ExtendedWebSocket;

    // Set up client
    healthChecker.setupClient(mockClient);

    // Get the pong handler from the mock call
    const pongHandler = mockOn.mock.calls[0][1];

    // Set isAlive to false
    mockClient.isAlive = false;

    // Call pong handler with timestamp data
    pongHandler(Buffer.from('1234567890'));

    // Should set isAlive back to true
    expect(mockClient.isAlive).toBe(true);
  });

  test('should ping clients and terminate unresponsive ones', () => {
    // Mock setTimeout and clearTimeout
    const originalSetTimeout = global.setTimeout;
    const originalClearTimeout = global.clearTimeout;
    const mockSetTimeout = jest.fn().mockReturnValue(456);
    const mockClearTimeout = jest.fn();
    global.setTimeout = mockSetTimeout as unknown as typeof global.setTimeout;
    global.clearTimeout = mockClearTimeout as unknown as typeof global.clearTimeout;

    try {
      // Create mock clients with properly typed jest functions
      const mockPingResponsive = jest.fn((data, mask, callback) => {
        if (callback) {
          // Important: First set isAlive to true to simulate a pong response
          responsiveClient.isAlive = true;
          callback(undefined);
        }
      });

      const mockTerminateResponsive = jest.fn();
      const responsiveClient = {
        readyState: WebSocket.OPEN,
        isAlive: true,
        ping: mockPingResponsive,
        terminate: mockTerminateResponsive,
        user: { username: 'responsive' },
        sessionId: 'responsive-session'
      };

      const mockTerminateUnresponsive = jest.fn();
      const unresponsiveClient = {
        readyState: WebSocket.OPEN,
        isAlive: false,
        ping: jest.fn(),
        terminate: mockTerminateUnresponsive,
        user: { username: 'unresponsive' },
        sessionId: 'unresponsive-session'
      };

      // Add clients to mock WebSocketServer
      mockClients.add(responsiveClient);
      mockClients.add(unresponsiveClient);

      // Call pingClients directly
      (healthChecker as any).pingClients();

      // Both clients should be pinged
      expect(mockPingResponsive).toHaveBeenCalled();

      // Unresponsive client should be terminated
      expect(mockTerminateUnresponsive).toHaveBeenCalled();

      // Responsive client should not be terminated
      expect(mockTerminateResponsive).not.toHaveBeenCalled();

      // Should have set a timeout
      expect(mockSetTimeout).toHaveBeenCalled();

      // Get the timeout function
      const timeoutFn = mockSetTimeout.mock.calls[0][0];

      // Simulate the timeout callback - but since isAlive is true, it shouldn't terminate
      timeoutFn();

      // Responsive client should still not be terminated
      expect(mockTerminateResponsive).not.toHaveBeenCalled();
    } finally {
      // Restore original timer functions
      global.setTimeout = originalSetTimeout;
      global.clearTimeout = originalClearTimeout;
    }
  });

  test('should handle ping errors', () => {
    // Create mock client that throws error on ping
    const pingError = new Error('Ping error');
    const mockPingError = jest.fn((data, mask, callback) => {
      if (callback) callback(pingError);
    });

    const mockTerminateError = jest.fn();
    const errorClient = {
      readyState: WebSocket.OPEN,
      isAlive: true,
      ping: mockPingError,
      terminate: mockTerminateError,
      user: { username: 'error-client' },
      sessionId: 'error-session'
    };

    // Add client to mock WebSocketServer
    mockClients.add(errorClient);

    // Call pingClients directly
    (healthChecker as any).pingClients();

    // Client should be terminated on ping error
    expect(mockTerminateError).toHaveBeenCalled();

    // Logger error should be called
    expect(mockError).toHaveBeenCalledWith('Error sending ping', expect.any(Object));
  });
});
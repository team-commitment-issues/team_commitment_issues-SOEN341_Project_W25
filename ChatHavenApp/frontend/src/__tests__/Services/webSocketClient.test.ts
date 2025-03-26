import WebSocketClient from '../../Services/webSocketClient';
import { WebSocketMessage } from '../../types/shared';

// Mock the WebSocket class since it's defined in global scope
// (This complements your existing setup in setupTests.ts)
describe('WebSocketClient', () => {
  let mockWebSocket: jest.Mocked<WebSocket> & {
    mockReceiveMessage: (data: any) => void;
    mockDisconnect: (code?: number, reason?: string) => void;
    mockError: (message?: string) => void;
  };

  beforeEach(() => {
    // Clear previous mocks
    jest.clearAllMocks();

    // Reset any running timers
    jest.useRealTimers();
    jest.useFakeTimers();

    // Reset local storage between tests
    localStorage.clear();

    // Clear any previous WebSocket client instance
    // @ts-ignore - accessing private static property for testing
    WebSocketClient.instance = undefined;

    // Make sure we're using the mock WebSocket from setupTests.ts
    mockWebSocket = new (global.WebSocket as any)('ws://test-url') as any;
  });

  afterEach(() => {
    // Clean up any WebSocket client connections
    const client = WebSocketClient.getInstance();
    client.close();

    // Restore the original implementation
    jest.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should create only one instance of WebSocketClient', () => {
      const instance1 = WebSocketClient.getInstance();
      const instance2 = WebSocketClient.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Connection Management', () => {
    it('should connect to WebSocket server with token', async () => {
      const client = WebSocketClient.getInstance();
      const token = 'test-token';

      const connectPromise = client.connect(token);

      // Simulate WebSocket connection
      mockWebSocket.onopen?.({ target: mockWebSocket } as any);

      await connectPromise;

      expect(client.isConnected()).toBe(true);
      expect(global.WebSocket).toHaveBeenCalledWith(
        expect.stringContaining(`/ws?token=${token}`),
        undefined
      );
    });

    it('should handle connection errors', async () => {
      const client = WebSocketClient.getInstance();
      const errorCallback = jest.fn();

      client.addErrorListener(errorCallback);

      const connectPromise = client.connect('test-token');

      // Simulate a WebSocket error
      const errorEvent = new Event('error');
      mockWebSocket.onerror?.(errorEvent);

      await expect(connectPromise).rejects.toBeDefined();
      expect(errorCallback).toHaveBeenCalledWith(errorEvent);
    });

    it('should call connection listeners when connected', async () => {
      const client = WebSocketClient.getInstance();
      const connectionCallback = jest.fn();

      client.addConnectionListener(connectionCallback);

      const connectPromise = client.connect('test-token');

      // Simulate WebSocket connection
      mockWebSocket.onopen?.({ target: mockWebSocket } as any);

      await connectPromise;

      expect(connectionCallback).toHaveBeenCalled();
    });

    it('should call disconnection listeners when disconnected', async () => {
      const client = WebSocketClient.getInstance();
      const disconnectionCallback = jest.fn();

      client.addDisconnectionListener(disconnectionCallback);

      await client.connect('test-token');
      mockWebSocket.onopen?.({ target: mockWebSocket } as any);

      // Simulate WebSocket disconnection
      mockWebSocket.onclose?.({
        code: 1006,
        reason: 'Connection lost',
        wasClean: false
      } as any);

      expect(disconnectionCallback).toHaveBeenCalled();
    });

    it('should attempt to reconnect when connection is lost', async () => {
      const client = WebSocketClient.getInstance();

      await client.connect('test-token');
      mockWebSocket.onopen?.({ target: mockWebSocket } as any);

      // Simulate WebSocket disconnection (unexpected)
      mockWebSocket.onclose?.({
        code: 1006,
        reason: 'Connection lost',
        wasClean: false
      } as any);

      // Fast forward through reconnection delay
      jest.runOnlyPendingTimers();

      // Second instance of WebSocket should be created
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
    });

    it('should not attempt to reconnect when closed intentionally', async () => {
      const client = WebSocketClient.getInstance();

      await client.connect('test-token');
      mockWebSocket.onopen?.({ target: mockWebSocket } as any);

      // Simulate intentional WebSocket close
      mockWebSocket.onclose?.({
        code: 1000,
        reason: 'User initiated disconnect',
        wasClean: true
      } as any);

      // Fast forward through any potential timers
      jest.runAllTimers();

      // No additional WebSocket instance should be created
      expect(global.WebSocket).toHaveBeenCalledTimes(1);
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      const client = WebSocketClient.getInstance();
      await client.connect('test-token');
      mockWebSocket.onopen?.({ target: mockWebSocket } as any);
    });

    it('should send messages when connected', () => {
      const client = WebSocketClient.getInstance();
      const message: WebSocketMessage = { type: 'test' };

      client.send(message);

      expect(mockWebSocket.send).toHaveBeenCalledWith(expect.stringContaining('"type":"test"'));
    });

    it('should queue messages when not connected', async () => {
      const client = WebSocketClient.getInstance();

      // Close the connection
      client.close();

      // Try to send a message when disconnected
      const message: WebSocketMessage = { type: 'test' };
      client.send(message);

      // Verify message wasn't sent immediately
      expect(mockWebSocket.send).not.toHaveBeenCalledWith(expect.stringContaining('"type":"test"'));

      // Now reconnect
      await client.connect('test-token');
      mockWebSocket.onopen?.({ target: mockWebSocket } as any);

      // Verify queued message was sent after reconnection
      expect(mockWebSocket.send).toHaveBeenCalledWith(expect.stringContaining('"type":"test"'));
    });

    it('should add clientMessageId to messages', () => {
      const client = WebSocketClient.getInstance();
      const message: WebSocketMessage = { type: 'test' };

      const clientMessageId = client.send(message);

      expect(clientMessageId).toMatch(/^client_\d+_/);
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining(`"clientMessageId":"${clientMessageId}"`)
      );
    });

    it('should enable retry mechanism correctly', async () => {
      const client = WebSocketClient.getInstance();
      client.setRetryEnabled(true);

      // Spy on the private sendWithoutQueuing method
      const sendSpy = jest.spyOn(mockWebSocket, 'send');

      // Send a message
      const message: WebSocketMessage = { type: 'test' };
      const clientMessageId = client.send(message);

      // First send should occur immediately
      expect(sendSpy).toHaveBeenCalledTimes(1);

      // Advance past retry delay
      jest.advanceTimersByTime(3000);

      // Should have attempted a retry
      expect(sendSpy).toHaveBeenCalledTimes(2);

      // Simulate successful message receipt to cancel retries
      mockWebSocket.onmessage?.({
        data: JSON.stringify({
          type: 'test',
          clientMessageId
        })
      } as any);

      // Advance timer again
      jest.advanceTimersByTime(3000);

      // No additional retries should occur
      expect(sendSpy).toHaveBeenCalledTimes(2);
    });

    it('should register and trigger message status callbacks', async () => {
      const client = WebSocketClient.getInstance();
      client.setRetryEnabled(true);

      const statusCallback = jest.fn();
      const message: WebSocketMessage = { type: 'message', text: 'Hello' };

      // Send message and register status callback
      const clientMessageId = client.send(message);
      client.registerMessageStatusCallback(clientMessageId, statusCallback);

      // Simulate server acknowledgment
      mockWebSocket.onmessage?.({
        data: JSON.stringify({
          type: 'message',
          clientMessageId,
          text: 'Hello'
        })
      } as any);

      expect(statusCallback).toHaveBeenCalledWith('sent');

      // Simulate explicit read receipt
      mockWebSocket.onmessage?.({
        data: JSON.stringify({
          type: 'messageAck',
          messageId: clientMessageId,
          status: 'read'
        })
      } as any);

      expect(statusCallback).toHaveBeenCalledWith('read');
    });
  });

  describe('Subscription Mechanism', () => {
    beforeEach(async () => {
      const client = WebSocketClient.getInstance();
      await client.connect('test-token');
      mockWebSocket.onopen?.({ target: mockWebSocket } as any);
    });

    it('should subscribe to specific message types', () => {
      const client = WebSocketClient.getInstance();
      const callback = jest.fn();

      const subId = client.subscribe('testType', callback);

      // Simulate receiving a matching message
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ type: 'testType', data: 'test' })
      } as any);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'testType', data: 'test' })
      );

      // Verify unsubscribing works
      const result = client.unsubscribe(subId);
      expect(result).toBe(true);

      // Reset mock
      callback.mockReset();

      // Send another message
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ type: 'testType', data: 'test2' })
      } as any);

      // Callback should not be called after unsubscribing
      expect(callback).not.toHaveBeenCalled();
    });

    it('should subscribe to wildcard message types', () => {
      const client = WebSocketClient.getInstance();
      const callback = jest.fn();

      client.subscribe('*', callback);

      // Simulate receiving messages of different types
      mockWebSocket.onmessage?.({
        data: JSON.stringify({ type: 'type1', data: 'test1' })
      } as any);

      mockWebSocket.onmessage?.({
        data: JSON.stringify({ type: 'type2', data: 'test2' })
      } as any);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'type1', data: 'test1' })
      );
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'type2', data: 'test2' })
      );
    });
  });

  describe('Heartbeat and cleanup', () => {
    it('should setup a heartbeat ping', async () => {
      const client = WebSocketClient.getInstance();
      await client.connect('test-token');
      mockWebSocket.onopen?.({ target: mockWebSocket } as any);

      const sendSpy = jest.spyOn(mockWebSocket, 'send');

      // Setup a heartbeat with 1000ms interval (for faster testing)
      const heartbeatInterval = client.setupHeartbeat(1000);

      // Fast forward 1000ms
      jest.advanceTimersByTime(1000);

      // Verify ping message was sent
      expect(sendSpy).toHaveBeenCalledWith(expect.stringContaining('"type":"ping"'));

      // Clean up the interval
      clearInterval(heartbeatInterval);
    });

    it('should handle manual retry cancellation', async () => {
      const client = WebSocketClient.getInstance();
      client.setRetryEnabled(true);
      await client.connect('test-token');
      mockWebSocket.onopen?.({ target: mockWebSocket } as any);

      const message: WebSocketMessage = { type: 'test' };
      const clientMessageId = client.send(message);

      // Cancel the retry
      const result = client.cancelRetry(clientMessageId);

      // Should return true indicating a retry was cancelled
      expect(result).toBe(true);

      // Verify no pending messages left
      expect(client.getPendingMessages().size).toBe(0);
    });
  });
});

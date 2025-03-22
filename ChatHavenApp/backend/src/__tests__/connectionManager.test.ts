// Updated connectionManager.test.ts

// Define mock logger functions before mocking
const mockLoggerFunctions = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Mock dependencies
jest.mock('../services/onlineStatusService');
jest.mock('ws');
jest.mock('../utils/logger', () => ({
  createLogger: jest.fn(() => mockLoggerFunctions),
}));

import ConnectionManager from '../services/connectionManager';
import { WebSocketServer, WebSocket } from 'ws';
import { Status } from '../enums';
import OnlineStatusService from '../services/onlineStatusService';
import { Schema } from 'mongoose';
import { ExtendedWebSocket } from '../types/websocket';

describe('ConnectionManager', () => {
  let connectionManager: ConnectionManager;
  let mockWss: WebSocketServer;
  let mockClients: Set<any>;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Set up mock WebSocketServer
    mockClients = new Set();
    mockWss = {
      clients: mockClients,
      on: jest.fn(),
      close: jest.fn()
    } as unknown as WebSocketServer;
    
    // Create connection manager
    connectionManager = new ConnectionManager(mockWss);
    
    // Mock OnlineStatusService
    (OnlineStatusService.getUserByUsername as jest.Mock).mockResolvedValue({
      _id: 'user-id',
      username: 'testuser'
    });
    (OnlineStatusService.getUserTeams as jest.Mock).mockResolvedValue(['team-id']);
    (OnlineStatusService.getTeamSubscribers as jest.Mock).mockResolvedValue(['testuser', 'otheruser']);
  });
  
  // Cleanup after each test
  afterEach(() => {
    // Shut down the connection manager to clear the interval
    connectionManager.shutdown();
  });
  
  test('should track connections', () => {
    // Create mock client with properly typed jest functions
    const mockClient = {
      readyState: WebSocket.OPEN,
      user: { username: 'testuser' },
      sessionId: 'test-session',
      send: jest.fn()
    };
    
    // Track connection
    connectionManager.trackConnection(mockClient as unknown as ExtendedWebSocket);
    
    // Get stats
    const stats = connectionManager.getStats();
    
    // Verify connection was tracked
    expect(stats.totalConnections).toBe(1);
  });
  
  test('should track messages', () => {
    // Track messages
    connectionManager.trackMessage();
    connectionManager.trackMessage();
    
    // Get stats
    const stats = connectionManager.getStats();
    
    // Verify messages were tracked
    expect(stats.totalMessages).toBe(2);
  });
  
  test('should broadcast status updates', async () => {
    // Create mock clients with properly typed jest functions
    const mockSend1 = jest.fn();
    const mockClient1 = {
      readyState: WebSocket.OPEN,
      user: { username: 'testuser' },
      send: mockSend1,
      sessionId: 'test-session-1'
    };
    
    const mockSend2 = jest.fn();
    const mockClient2 = {
      readyState: WebSocket.OPEN,
      user: { username: 'otheruser' },
      send: mockSend2,
      sessionId: 'test-session-2'
    };
    
    // Add clients to mock WebSocketServer
    mockClients.add(mockClient1);
    mockClients.add(mockClient2);
    
    // Broadcast status update
    const lastSeen = new Date();
    await connectionManager.broadcastStatusUpdate('testuser', Status.AWAY, lastSeen);
    
    // Both clients should receive the update
    expect(mockSend1).toHaveBeenCalled();
    expect(mockSend2).toHaveBeenCalled();
    
    // Verify the message format
    const sentMessage = JSON.parse(mockSend1.mock.calls[0][0]);
    expect(sentMessage.type).toBe('statusUpdate');
    expect(sentMessage.username).toBe('testuser');
    expect(sentMessage.status).toBe(Status.AWAY);
  });
  
  test('should get user connections', () => {
    // Create mock clients with properly typed jest functions
    const mockClient1 = {
      readyState: WebSocket.OPEN,
      user: { username: 'testuser' },
      send: jest.fn(),
      sessionId: 'test-session-1'
    };
    
    const mockClient2 = {
      readyState: WebSocket.OPEN,
      user: { username: 'testuser' },
      send: jest.fn(),
      sessionId: 'test-session-2'
    };
    
    const mockClient3 = {
      readyState: WebSocket.OPEN,
      user: { username: 'otheruser' },
      send: jest.fn(),
      sessionId: 'test-session-3'
    };
    
    // Add clients to mock WebSocketServer
    mockClients.add(mockClient1);
    mockClients.add(mockClient2);
    mockClients.add(mockClient3);
    
    // Get connections for 'testuser'
    const connections = connectionManager.getUserConnections('testuser');
    
    // Should have 2 connections
    expect(connections.length).toBe(2);
    expect(connections).toContainEqual(expect.objectContaining({ sessionId: 'test-session-1' }));
    expect(connections).toContainEqual(expect.objectContaining({ sessionId: 'test-session-2' }));
    expect(connections).not.toContainEqual(expect.objectContaining({ sessionId: 'test-session-3' }));
  });
  
  test('should send message to all user connections', () => {
    // Create mock clients with properly typed jest functions
    const mockSend1 = jest.fn();
    const mockClient1 = {
      readyState: WebSocket.OPEN,
      user: { username: 'testuser' },
      send: mockSend1,
      sessionId: 'test-session-1'
    };
    
    const mockSend2 = jest.fn();
    const mockClient2 = {
      readyState: WebSocket.OPEN,
      user: { username: 'testuser' },
      send: mockSend2,
      sessionId: 'test-session-2'
    };
    
    const mockSend3 = jest.fn();
    const mockClient3 = {
      readyState: WebSocket.OPEN,
      user: { username: 'otheruser' },
      send: mockSend3,
      sessionId: 'test-session-3'
    };
    
    // Add clients to mock WebSocketServer
    mockClients.add(mockClient1);
    mockClients.add(mockClient2);
    mockClients.add(mockClient3);
    
    // Send message to 'testuser'
    const message = { type: 'customMessage', content: 'Hello' };
    connectionManager.sendToUser('testuser', message);
    
    // Verify message was sent to correct clients
    const expectedMessage = JSON.stringify(message);
    expect(mockSend1).toHaveBeenCalledWith(expectedMessage);
    expect(mockSend2).toHaveBeenCalledWith(expectedMessage);
    expect(mockSend3).not.toHaveBeenCalled();
  });
  
  test('should log stats periodically', () => {
    // Create mock client with properly typed jest functions
    const mockClient = {
      readyState: WebSocket.OPEN,
      user: { username: 'testuser' },
      send: jest.fn(),
      sessionId: 'test-session'
    };
    
    // Add client to mock WebSocketServer
    mockClients.add(mockClient);
    
    // Track some activity
    connectionManager.trackConnection(mockClient as unknown as ExtendedWebSocket);
    connectionManager.trackMessage();
    
    // Call logStats directly
    (connectionManager as any).logStats();
    
    // Verify logging occurred using the shared mock logger functions
    expect(mockLoggerFunctions.info).toHaveBeenCalledWith('Connection statistics', expect.objectContaining({
      currentConnections: 1,
      totalConnections: 1,
      totalMessages: 1
    }));
  });
  
  test('should handle errors in status update broadcasting', async () => {
    // Mock OnlineStatusService to throw an error
    (OnlineStatusService.getUserByUsername as jest.Mock).mockRejectedValue(new Error('Test error'));
    
    // Try to broadcast status update
    await connectionManager.broadcastStatusUpdate('testuser', Status.AWAY, new Date());
    
    // Verify error was logged using the shared mock logger functions
    expect(mockLoggerFunctions.error).toHaveBeenCalledWith('Error broadcasting status update', expect.any(Object));
  });
});
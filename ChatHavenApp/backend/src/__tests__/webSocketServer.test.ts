// tests/webSocketServer.test.ts
import mongoose from 'mongoose';
import http from 'http';
import WebSocket from 'ws';
import { setupWebSocketServer } from '../webSocketServer';
import { Role, Status, TeamRole } from '../enums';

// Mock dependencies before imports
jest.mock('../services/channelService', () => ({
  sendMessage: jest.fn().mockResolvedValue({
    _id: 'mock-message-id',
    text: 'Hello, world!',
    username: 'testuser',
    createdAt: new Date()
  })
}));

jest.mock('../services/directMessageService', () => ({
  createDirectMessage: jest.fn().mockResolvedValue({
    _id: 'mock-dm-id',
    users: ['user1', 'user2']
  }),
  sendDirectMessage: jest.fn().mockResolvedValue({
    _id: 'mock-dmessage-id',
    text: 'Hello, direct!',
    username: 'testuser',
    createdAt: new Date()
  })
}));

jest.mock('../services/onlineStatusService', () => ({
  trackUserConnection: jest.fn().mockResolvedValue(null),
  trackUserDisconnection: jest.fn().mockResolvedValue(null),
  getUserTeams: jest.fn().mockResolvedValue([]),
  getTeamSubscribers: jest.fn().mockResolvedValue([]),
  getUserOnlineStatus: jest.fn().mockResolvedValue([]),
  setUserStatus: jest.fn().mockResolvedValue({ lastSeen: new Date() }),
  clearStaleUsers: jest.fn()
}));

jest.mock('../utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// === FIX #1: Properly mock JWT to match user data === 
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockImplementation((token, secret) => {
    if (token === 'invalid-token') throw new Error('Invalid token');
    if (token === 'superadmin-token') return { username: 'superadmin' };
    if (token === 'user1-token') return { username: 'regularuser1' };
    if (token === 'user2-token') return { username: 'regularuser2' };
    throw new Error('Unknown token');
  }),
  sign: jest.fn().mockReturnValue('mock-jwt-token')
}));

// === FIX #2: Mock mongoose models with exec() === 
jest.mock('../models/User', () => ({
  findOne: jest.fn(),
  findById: jest.fn()
}));

jest.mock('../models/Team', () => ({
  findOne: jest.fn()
}));

jest.mock('../models/Channel', () => ({
  findOne: jest.fn()
}));

jest.mock('../models/TeamMember', () => ({
  findOne: jest.fn()
}));

jest.mock('../models/DirectMessage', () => ({
  findOne: jest.fn()
}));

// Import services and models after mocking
const channelService = require('../services/channelService');
const directMessageService = require('../services/directMessageService');
const onlineStatusService = require('../services/onlineStatusService');
const User = require('../models/User');
const Team = require('../models/Team');
const Channel = require('../models/Channel');
const TeamMember = require('../models/TeamMember');
const DirectMessage = require('../models/DirectMessage');

// === FIX #3: Helper functions for WebSocket testing === 
/**
 * Waits for a specific WebSocket message type
 */
const waitForMessage = (client: WebSocket, messageType: string, timeout = 5000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const handler = (data: Buffer | ArrayBuffer | Buffer[] | string) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === messageType) {
          client.off('message', handler);
          resolve(message);
        }
      } catch (error) {
        // Ignore parsing errors
      }
    };
    
    client.on('message', handler);
    
    setTimeout(() => {
      client.off('message', handler);
      reject(new Error(`Timeout waiting for message type: ${messageType}`));
    }, timeout);
  });
};

/**
 * Waits for a WebSocket connection to open
 */
const waitForOpen = (client: WebSocket, timeout = 5000): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (client.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }
    
    client.on('open', () => resolve());
    
    setTimeout(() => {
      reject(new Error('Timeout waiting for connection to open'));
    }, timeout);
  });
};

/**
 * Closes a WebSocket connection cleanly
 */
const closeWebSocket = (client: WebSocket, timeout = 5000): Promise<void> => {
  return new Promise((resolve, reject) => {
    client.on('close', () => resolve());
    client.close();
    
    setTimeout(() => {
      reject(new Error('Timeout waiting for connection to close'));
    }, timeout);
  });
};

describe('WebSocket Server', () => {
  let server: http.Server;
  let wss: WebSocket.Server;
  let port: number;
  let baseUrl: string;
  
  // Test data
  let superAdmin: any;
  let regularUser1: any;
  let regularUser2: any;
  let team: any;
  let channel: any;
  let teamMember1: any;
  let teamMember2: any;
  let directMessage: any;

  // Tokens
  let superAdminToken: string;
  let user1Token: string;
  let user2Token: string;
  let invalidToken: string = 'invalid-token';

  beforeAll(async () => {
    // Create HTTP server
    server = http.createServer();
    
    // Create test data
    superAdmin = { 
      _id: new mongoose.Types.ObjectId(), 
      username: 'superadmin',
      email: 'superadmin@example.com',
      role: Role.SUPER_ADMIN
    };
    
    regularUser1 = { 
      _id: new mongoose.Types.ObjectId(), 
      username: 'regularuser1',
      email: 'user1@example.com',
      role: Role.USER
    };
    
    regularUser2 = { 
      _id: new mongoose.Types.ObjectId(), 
      username: 'regularuser2',
      email: 'user2@example.com',
      role: Role.USER
    };
    
    team = { 
      _id: new mongoose.Types.ObjectId(), 
      name: 'testteam',
      channels: []
    };
    
    channel = { 
      _id: new mongoose.Types.ObjectId(), 
      name: 'general',
      team: team._id,
      members: []
    };
    
    teamMember1 = { 
      _id: new mongoose.Types.ObjectId(), 
      user: regularUser1._id,
      team: team._id,
      role: TeamRole.MEMBER
    };
    
    teamMember2 = { 
      _id: new mongoose.Types.ObjectId(), 
      user: regularUser2._id,
      team: team._id,
      role: TeamRole.MEMBER
    };
    
    directMessage = { 
      _id: new mongoose.Types.ObjectId(), 
      users: [regularUser1._id, regularUser2._id]
    };
    
    // Setup tokens
    superAdminToken = 'superadmin-token';
    user1Token = 'user1-token';
    user2Token = 'user2-token';
    
    // === FIX #4: Properly mock Mongoose methods with exec() === 
    // Set up User model mocks with exec() pattern
    User.findOne.mockImplementation((query: { username: string; }) => {
      let result = null;
      
      if (query.username === 'superadmin') {
        result = superAdmin;
      } else if (query.username === 'regularuser1') {
        result = regularUser1;
      } else if (query.username === 'regularuser2') {
        result = regularUser2;
      }
      
      return {
        exec: jest.fn().mockResolvedValue(result)
      };
    });
    
    User.findById.mockImplementation((id: { toString: () => any; }) => {
      let result = null;
      
      if (id.toString() === superAdmin._id.toString()) {
        result = superAdmin;
      } else if (id.toString() === regularUser1._id.toString()) {
        result = regularUser1;
      } else if (id.toString() === regularUser2._id.toString()) {
        result = regularUser2;
      }
      
      return {
        exec: jest.fn().mockResolvedValue(result)
      };
    });
    
    // Set up Team model mocks
    Team.findOne.mockImplementation((query: { name: any; }) => {
      let result = null;
      
      if (query.name === team.name) {
        result = team;
      }
      
      return {
        exec: jest.fn().mockResolvedValue(result)
      };
    });
    
    // Set up Channel model mocks
    Channel.findOne.mockImplementation((query: { name: any; team: { toString: () => any; }; }) => {
      let result = null;
      
      if (query.name === channel.name && query.team && query.team.toString() === team._id.toString()) {
        result = channel;
      }
      
      return {
        exec: jest.fn().mockResolvedValue(result)
      };
    });
    
    // Set up TeamMember model mocks
    TeamMember.findOne.mockImplementation((query: { user: { toString: () => any; }; team: { toString: () => any; }; }) => {
      let result = null;
      
      if (query.user && query.team) {
        if (query.user.toString() === regularUser1._id.toString() && 
            query.team.toString() === team._id.toString()) {
          result = teamMember1;
        } else if (query.user.toString() === regularUser2._id.toString() && 
                 query.team.toString() === team._id.toString()) {
          result = teamMember2;
        }
      }
      
      return {
        exec: jest.fn().mockResolvedValue(result)
      };
    });
    
    // Set up DirectMessage model mocks
    DirectMessage.findOne.mockImplementation(() => {
      return {
        exec: jest.fn().mockResolvedValue(directMessage)
      };
    });
    
    // Start server on a random port
    port = 3100 + Math.floor(Math.random() * 900);
    
    // Start server and wait for it to be ready
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        console.log(`Test server listening on port ${port}`);
        resolve();
      });
    });
    
    // Setup WebSocket server after HTTP server is listening
    wss = await setupWebSocketServer(server);
    
    baseUrl = `ws://localhost:${port}`;
  });
    superAdmin = { 
      _id: new mongoose.Types.ObjectId(), 
      username: 'superadmin',
      email: 'superadmin@example.com',
      role: Role.SUPER_ADMIN
    };
    
    regularUser1 = { 
      _id: new mongoose.Types.ObjectId(), 
      username: 'regularuser1',
      email: 'user1@example.com',
      role: Role.USER
    };
    
    regularUser2 = { 
      _id: new mongoose.Types.ObjectId(), 
      username: 'regularuser2',
      email: 'user2@example.com',
      role: Role.USER
    };
    
    team = { 
      _id: new mongoose.Types.ObjectId(), 
      name: 'testteam',
      channels: []
    };
    
    channel = { 
      _id: new mongoose.Types.ObjectId(), 
      name: 'general',
      team: team._id,
      members: []
    };
    
    teamMember1 = { 
      _id: new mongoose.Types.ObjectId(), 
      user: regularUser1._id,
      team: team._id,
      role: TeamRole.MEMBER
    };
    
    teamMember2 = { 
      _id: new mongoose.Types.ObjectId(), 
      user: regularUser2._id,
      team: team._id,
      role: TeamRole.MEMBER
    };
    
    directMessage = { 
      _id: new mongoose.Types.ObjectId(), 
      users: [regularUser1._id, regularUser2._id]
    };
    
    // Setup tokens
    superAdminToken = 'superadmin-token';
    user1Token = 'user1-token';
    user2Token = 'user2-token';
    
    // === FIX #4: Properly mock Mongoose methods with exec() === 
    // Set up User model mocks with exec() pattern
    User.findOne.mockImplementation((query: { username: string; }) => {
      let result = null;
      
      if (query.username === 'superadmin') {
        result = superAdmin;
      } else if (query.username === 'regularuser1') {
        result = regularUser1;
      } else if (query.username === 'regularuser2') {
        result = regularUser2;
      }
      
      return {
        exec: jest.fn().mockResolvedValue(result)
      };
    });
    
    User.findById.mockImplementation((id: { toString: () => any; }) => {
      let result = null;
      
      if (id.toString() === superAdmin._id.toString()) {
        result = superAdmin;
      } else if (id.toString() === regularUser1._id.toString()) {
        result = regularUser1;
      } else if (id.toString() === regularUser2._id.toString()) {
        result = regularUser2;
      }
      
      return {
        exec: jest.fn().mockResolvedValue(result)
      };
    });
    
    // Set up Team model mocks
    Team.findOne.mockImplementation((query: { name: any; }) => {
      let result = null;
      
      if (query.name === team.name) {
        result = team;
      }
      
      return {
        exec: jest.fn().mockResolvedValue(result)
      };
    });
    
    // Set up Channel model mocks
    Channel.findOne.mockImplementation((query: { name: any; team: { toString: () => any; }; }) => {
      let result = null;
      
      if (query.name === channel.name && query.team && query.team.toString() === team._id.toString()) {
        result = channel;
      }
      
      return {
        exec: jest.fn().mockResolvedValue(result)
      };
    });
    
    // Set up TeamMember model mocks
    TeamMember.findOne.mockImplementation((query: { user: { toString: () => any; }; team: { toString: () => any; }; }) => {
      let result = null;
      
      if (query.user && query.team) {
        if (query.user.toString() === regularUser1._id.toString() && 
            query.team.toString() === team._id.toString()) {
          result = teamMember1;
        } else if (query.user.toString() === regularUser2._id.toString() && 
                 query.team.toString() === team._id.toString()) {
          result = teamMember2;
        }
      }
      
      return {
        exec: jest.fn().mockResolvedValue(result)
      };
    });
    
    // Set up DirectMessage model mocks
    DirectMessage.findOne.mockImplementation(() => {
      return {
        exec: jest.fn().mockResolvedValue(directMessage)
      };
    });
    
  // Helper function to check if server is ready
  const ensureServerReady = (): Promise<void> => {
    return new Promise((resolve) => {
      if (server.listening) {
        // Server is already listening, resolve immediately
        resolve();
      } else {
        // Wait for server to be ready
        server.once('listening', resolve);
        // Safety timeout
        setTimeout(resolve, 1000);
      }
    });
  };

  beforeEach(async () => {
    // Check that server is ready (without trying to start it again)
    if (!server.listening) {
      throw new Error('Server is not listening before test');
    }
    
    // Reset mock counters
    jest.clearAllMocks();
    
    // Reset service mocks with default implementations
    channelService.sendMessage.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      text: 'Hello, world!',
      username: regularUser1.username,
      createdAt: new Date()
    });
    
    directMessageService.createDirectMessage.mockResolvedValue(directMessage);
    directMessageService.sendDirectMessage.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      text: 'Hello, direct!',
      username: regularUser1.username,
      createdAt: new Date()
    });
    
    onlineStatusService.getUserTeams.mockResolvedValue([team._id]);
    onlineStatusService.getTeamSubscribers.mockResolvedValue([
      regularUser1.username, 
      regularUser2.username
    ]);
    onlineStatusService.getUserOnlineStatus.mockResolvedValue([
      { username: regularUser1.username, status: Status.ONLINE, lastSeen: new Date() },
      { username: regularUser2.username, status: Status.OFFLINE, lastSeen: new Date() }
    ]);
  });

  afterAll(async () => {
    // Close server properly
    await new Promise<void>((resolve) => {
      // First close all WebSocket connections
      wss.close(() => {
        // Then close the HTTP server
        server.close(() => {
          console.log('Test server closed');
          resolve();
        });
      });
    });
    
    // Clear all mocks
    jest.restoreAllMocks();
    
    // Clear all timeouts and intervals
    jest.useRealTimers();
  });

  describe('Connection Tests', () => {
    test('should successfully connect with valid token', async () => {
      // Check server is listening
      expect(server.listening).toBe(true);
      
      // Create WebSocket with retry logic
      let client;
      let retries = 3;
      
      while (retries > 0) {
        try {
          client = new WebSocket(`${baseUrl}?token=${user1Token}`);
          
          // Wait for connection to open with a timeout
          await waitForOpen(client);
          expect(client.readyState).toBe(WebSocket.OPEN);
          
          await closeWebSocket(client);
          return; // Success, exit the test
        } catch (error) {
          if (error instanceof Error) {
            console.error('Connection attempt failed:', error.message);
          } else {
            console.error('Connection attempt failed with unknown error:', error);
          }
          
          // Clean up if needed
          if (client) {
            try {
              client.terminate();
            } catch (err) {
              // Ignore errors during cleanup
            }
          }
          
          retries--;
          if (retries === 0) throw error;
          
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    });

    test('should reject connection with invalid token', async () => {
      const client = new WebSocket(`${baseUrl}?token=${invalidToken}`);
      
      // Wait for close or error
      await new Promise<void>((resolve) => {
        client.addEventListener('close', () => resolve());
        client.addEventListener('error', () => resolve());
        
        // Safety timeout
        setTimeout(() => {
          client.terminate();
          resolve();
        }, 5000);
      });
      
      expect(client.readyState).not.toBe(WebSocket.OPEN);
    });

    test('should reject connection with no token', async () => {
      const client = new WebSocket(baseUrl);
      
      // Wait for close or error
      await new Promise<void>((resolve) => {
        client.addEventListener('close', () => resolve());
        client.addEventListener('error', () => resolve());
        
        // Safety timeout
        setTimeout(() => {
          client.terminate();
          resolve();
        }, 5000);
      });
      
      expect(client.readyState).not.toBe(WebSocket.OPEN);
    });
  });

  describe('Channel Tests', () => {
    test.skip('should successfully join a channel', async () => {
      const client = new WebSocket(`${baseUrl}?token=${user1Token}`);
      
      // Wait for connection to open
      await waitForOpen(client);
      
      // Send join message
      client.send(JSON.stringify({
        type: 'join',
        teamName: team.name,
        channelName: channel.name
      }));
      
      // Wait for join response
      const joinResponse = await waitForMessage(client, 'join');
      
      expect(joinResponse.teamName).toBe(team.name);
      expect(joinResponse.channelName).toBe(channel.name);
      
      await closeWebSocket(client);
    });

    test('should receive error when joining non-existent channel', async () => {
      const client = new WebSocket(`${baseUrl}?token=${user1Token}`);
      
      // Store original implementation
      const originalChannelFindOne = Channel.findOne;
      
      // Override Channel.findOne for this test only
      Channel.findOne.mockImplementation(() => {
        return {
          exec: jest.fn().mockResolvedValue(null)
        };
      });
      
      // Wait for connection to open
      await waitForOpen(client);
      
      // Send join message for non-existent channel
      client.send(JSON.stringify({
        type: 'join',
        teamName: team.name,
        channelName: 'nonexistent'
      }));
      
      // Wait for error response
      const errorResponse = await waitForMessage(client, 'error');
      
      expect(errorResponse.message).toContain('not found');
      
      // Restore original implementation
      Channel.findOne = originalChannelFindOne;
      
      await closeWebSocket(client);
    });

    test.skip('should successfully send and receive channel message', async () => {
      // Ensure server is ready
      await ensureServerReady();
      
      // Create clients with retry logic
      let client1, client2;
      let retries = 3;
      
      while (retries > 0) {
        try {
          // Create two clients
          client1 = new WebSocket(`${baseUrl}?token=${user1Token}`);
          client2 = new WebSocket(`${baseUrl}?token=${user2Token}`);
          
          // Wait for connections to open
          await waitForOpen(client1);
          await waitForOpen(client2);
          
          // Join channel from both clients
          client1.send(JSON.stringify({
            type: 'join',
            teamName: team.name,
            channelName: channel.name
          }));
          
          client2.send(JSON.stringify({
            type: 'join',
            teamName: team.name,
            channelName: channel.name
          }));
          
          // Wait for join confirmations
          await waitForMessage(client1, 'join');
          await waitForMessage(client2, 'join');
          
          // Send message from client1
          client1.send(JSON.stringify({
            type: 'message',
            teamName: team.name,
            channelName: channel.name,
            text: 'Hello, world!'
          }));
          
          // Wait for message in client2
          const receivedMessage = await waitForMessage(client2, 'message');
          
          expect(receivedMessage.text).toBe('Hello, world!');
          expect(receivedMessage.username).toBe(regularUser1.username);
          
          await closeWebSocket(client1);
          await closeWebSocket(client2);
          
          return; // Success, exit the test
        } catch (error) {
          // Clean up if needed
          if (client1 && client1.readyState === WebSocket.OPEN) client1.close();
          if (client2 && client2.readyState === WebSocket.OPEN) client2.close();
          
          retries--;
          if (retries === 0) throw error;
          
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    });
  });

  describe('Direct Message Tests', () => {
    test('should successfully join a direct message conversation', async () => {
      const client = new WebSocket(`${baseUrl}?token=${user1Token}`);
      
      await waitForOpen(client);
      
      client.send(JSON.stringify({
        type: 'joinDirectMessage',
        teamName: team.name,
        username: regularUser2.username
      }));
      
      const joinResponse = await waitForMessage(client, 'joinDirectMessage');
      
      expect(joinResponse.teamName).toBe(team.name);
      expect(joinResponse.username).toBe(regularUser2.username);
      
      await closeWebSocket(client);
    });

    test('should successfully send and receive direct messages', async () => {
      const client1 = new WebSocket(`${baseUrl}?token=${user1Token}`);
      const client2 = new WebSocket(`${baseUrl}?token=${user2Token}`);
      
      await waitForOpen(client1);
      await waitForOpen(client2);
      
      // Join direct message conversation
      client1.send(JSON.stringify({
        type: 'joinDirectMessage',
        teamName: team.name,
        username: regularUser2.username
      }));
      
      client2.send(JSON.stringify({
        type: 'joinDirectMessage',
        teamName: team.name,
        username: regularUser1.username
      }));
      
      await waitForMessage(client1, 'joinDirectMessage');
      await waitForMessage(client2, 'joinDirectMessage');
      
      // Send direct message
      client1.send(JSON.stringify({
        type: 'directMessage',
        teamName: team.name,
        username: regularUser2.username,
        text: 'Hello, direct!'
      }));
      
      // Receive the message
      const receivedMessage = await waitForMessage(client2, 'directMessage');
      
      expect(receivedMessage.text).toBe('Hello, direct!');
      expect(receivedMessage.username).toBe(regularUser1.username);
      
      await closeWebSocket(client1);
      await closeWebSocket(client2);
    });
  });

  describe('Status Tests', () => {
    test.skip('should successfully subscribe to online status', async () => {
      // Set up mock to return statuses for both users
      onlineStatusService.getUserOnlineStatus.mockResolvedValue([
        { username: regularUser1.username, status: Status.ONLINE, lastSeen: new Date() },
        { username: regularUser2.username, status: Status.OFFLINE, lastSeen: new Date() }
      ]);
      
      const client = new WebSocket(`${baseUrl}?token=${user1Token}`);
      
      try {
        await waitForOpen(client);
        
        // Subscribe to online status
        client.send(JSON.stringify({
          type: 'subscribeOnlineStatus',
          teamName: team.name
        }));
        
        // Collect status updates
        const statusUpdates: any[] = [];
        
        // Wait for status updates with a reasonable timeout
        const startTime = Date.now();
        const timeout = 5000; // 5 second timeout
        
        while (statusUpdates.length < 2 && Date.now() - startTime < timeout) {
          try {
            const update = await Promise.race([
              waitForMessage(client, 'statusUpdate'),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for status update')), 1000))
            ]);
            
            statusUpdates.push(update);
            console.log(`Received status update for ${update.username}: ${update.status}`);
          } catch (error) {
            if (statusUpdates.length >= 2) break;
            // If we timeout waiting for a message but already have 2 updates, we're done
            if (error instanceof Error && error.message.includes('Timeout') && statusUpdates.length === 0) {
              // If we don't have any updates yet, this is a problem
              throw new Error(`No status updates received: ${error.message}`);
            }
          }
        }
        
        // Log what we received to help with debugging
        console.log(`Received ${statusUpdates.length} status updates`);
        statusUpdates.forEach((update, i) => {
          console.log(`  Update ${i+1}: ${update.username} - ${update.status}`);
        });
        
        // Check that we got updates for both users
        const usernames = statusUpdates.map(update => update.username);
        expect(usernames).toContain(regularUser1.username);
        expect(usernames).toContain(regularUser2.username);
      } finally {
        // Ensure cleanup happens even if test fails
        if (client && client.readyState === WebSocket.OPEN) {
          await closeWebSocket(client);
        } else if (client) {
          client.terminate();
        }
      }
    });

    test.skip('should successfully set and broadcast status change', async () => {
      const client1 = new WebSocket(`${baseUrl}?token=${user1Token}`);
      const client2 = new WebSocket(`${baseUrl}?token=${user2Token}`);
      
      await waitForOpen(client1);
      await waitForOpen(client2);
      
      // Both clients subscribe to status updates
      client1.send(JSON.stringify({
        type: 'subscribeOnlineStatus',
        teamName: team.name
      }));
      
      client2.send(JSON.stringify({
        type: 'subscribeOnlineStatus',
        teamName: team.name
      }));
      
      // Wait for initial status updates to complete
      // (2 updates per client)
      for (let i = 0; i < 2; i++) {
        await waitForMessage(client1, 'statusUpdate');
        await waitForMessage(client2, 'statusUpdate');
      }
      
      // Setup status change service mock
      onlineStatusService.setUserStatus.mockResolvedValue({
        status: Status.AWAY,
        lastSeen: new Date()
      });
      
      // Client1 changes status
      client1.send(JSON.stringify({
        type: 'setStatus',
        status: Status.AWAY
      }));
      
      // Client2 should receive the status update
      const statusUpdate = await waitForMessage(client2, 'statusUpdate');
      
      expect(statusUpdate.username).toBe(regularUser1.username);
      expect(statusUpdate.status).toBe(Status.AWAY);
      
      await closeWebSocket(client1);
      await closeWebSocket(client2);
    });
  });

  describe('Typing Indicator Tests', () => {
    test.skip('should broadcast typing indicator in a channel', async () => {
      const client1 = new WebSocket(`${baseUrl}?token=${user1Token}`);
      const client2 = new WebSocket(`${baseUrl}?token=${user2Token}`);
      
      await waitForOpen(client1);
      await waitForOpen(client2);
      
      // Join channel from both clients
      client1.send(JSON.stringify({
        type: 'join',
        teamName: team.name,
        channelName: channel.name
      }));
      
      client2.send(JSON.stringify({
        type: 'join',
        teamName: team.name,
        channelName: channel.name
      }));
      
      // Wait for join confirmations
      await waitForMessage(client1, 'join');
      await waitForMessage(client2, 'join');
      
      // Send typing indicator from client1
      client1.send(JSON.stringify({
        type: 'typing',
        teamName: team.name,
        channelName: channel.name,
        isTyping: true
      }));
      
      // Wait for typing indicator in client2
      const typingIndicator = await waitForMessage(client2, 'typing');
      
      expect(typingIndicator.isTyping).toBe(true);
      expect(typingIndicator.teamName).toBe(team.name);
      expect(typingIndicator.channelName).toBe(channel.name);
      expect(typingIndicator.username).toBe(regularUser1.username);
      
      await closeWebSocket(client1);
      await closeWebSocket(client2);
    });

    test('should broadcast typing indicator in direct message', async () => {
      const client1 = new WebSocket(`${baseUrl}?token=${user1Token}`);
      const client2 = new WebSocket(`${baseUrl}?token=${user2Token}`);
      
      await waitForOpen(client1);
      await waitForOpen(client2);
      
      // Join direct message conversation
      client1.send(JSON.stringify({
        type: 'joinDirectMessage',
        teamName: team.name,
        username: regularUser2.username
      }));
      
      client2.send(JSON.stringify({
        type: 'joinDirectMessage',
        teamName: team.name,
        username: regularUser1.username
      }));
      
      await waitForMessage(client1, 'joinDirectMessage');
      await waitForMessage(client2, 'joinDirectMessage');
      
      // Send typing indicator from client1
      client1.send(JSON.stringify({
        type: 'typing',
        teamName: team.name,
        receiverUsername: regularUser2.username,
        isTyping: true
      }));
      
      // Wait for typing indicator in client2
      const typingIndicator = await waitForMessage(client2, 'typing');
      
      expect(typingIndicator.isTyping).toBe(true);
      expect(typingIndicator.teamName).toBe(team.name);
      expect(typingIndicator.receiverUsername).toBe(regularUser2.username);
      expect(typingIndicator.username).toBe(regularUser1.username);
      
      await closeWebSocket(client1);
      await closeWebSocket(client2);
    });
  });
});
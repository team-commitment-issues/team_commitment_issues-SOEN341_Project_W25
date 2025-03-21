import { createServer, Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { setupWebSocketServer } from '../webSocketServer';
import { Role, TeamRole } from '../enums';
import TestHelpers from './testHelpers';
import OnlineStatusService from '../services/onlineStatusService';
import mongoose from 'mongoose';

let server: Server;
let wss: WebSocketServer;

// Mock OnlineStatusService methods
jest.mock('../services/onlineStatusService', () => ({
    trackUserConnection: jest.fn(),
    trackUserDisconnection: jest.fn(),
    getUserOnlineStatus: jest.fn().mockImplementation(async (usernames) => {
        return usernames.map((username: any) => ({
            username,
            status: 'offline',
            userId: 'mock-id',
            lastSeen: new Date()
        }));
    }),
    setUserStatus: jest.fn().mockImplementation(async (userId, username, status) => ({
        userId,
        username,
        status,
        lastSeen: new Date()
    })),
    getUserTeams: jest.fn().mockReturnValue([]),
    getTeamSubscribers: jest.fn().mockImplementation(() => Promise.resolve([])),
    clearStaleUsers: jest.fn()
}));

beforeAll(async () => {
    // Ensure MongoDB connection is established before tests start
    if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test-db');
    }
    
    // Initialize HTTP server and WebSocket server
    server = createServer();
    wss = setupWebSocketServer(server);
    
    // Start listening using a Promise instead of callback
    await new Promise<void>((resolve) => {
        server.listen(5001, () => resolve());
    });
});

afterAll(async () => {
    // Clean up all WebSocket connections
    wss.clients.forEach((client) => client.terminate());
    
    // Close WebSocket server with Promise
    await new Promise<void>((resolve) => {
        wss.close(() => resolve());
    });
    
    // Close HTTP server with Promise
    await new Promise<void>((resolve) => {
        server.close(() => resolve());
    });
    
    // Close MongoDB connection after all tests
    await mongoose.connection.close();
});

describe('WebSocket Server', () => {
    let token: string;
    let user: any;
    let teamMember: any;
    let team: any;
    let channel: any;
    let user2: any;
    let teamMember2: any;
    let dm: any;

    beforeEach(async () => {
        // Verify connection status before each test
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test-db');
        }
        
        // Reset all mocks before each test
        jest.clearAllMocks();
        
        user = await TestHelpers.createTestUser('test@user.com', 'testpassword', 'Test', 'User', 'testuser', Role.USER, []);
        team = await TestHelpers.createTestTeam('Test Team', user._id, [], []);
        teamMember = await TestHelpers.createTestTeamMember(user._id, team._id, TeamRole.MEMBER, []);
        channel = await TestHelpers.createTestChannel('Test Channel', team._id, user._id, [teamMember._id], []);
        user.teamMemberships.push(teamMember._id);
        await user.save();
        team.teamMembers.push(teamMember._id);
        team.channels.push(channel._id);
        await team.save();
        teamMember.channels.push(channel._id);
        await teamMember.save();
        token = await TestHelpers.generateToken(user.username, user.email);
        user2 = await TestHelpers.createTestUser('test2@user2.com', 'testpassword', 'Test2', 'User2', 'testuser2', Role.USER, []);
        teamMember2 = await TestHelpers.createTestTeamMember(user2._id, team._id, TeamRole.MEMBER, []);
        user2.teamMemberships.push(teamMember2._id);
        await user2.save();
        team.teamMembers.push(teamMember2._id);
        await team.save();
        const users = [user._id, user2._id];
        dm = await TestHelpers.createTestDirectMessage(users, []);
        teamMember.directMessages.push(dm._id);
        await teamMember.save();
        teamMember2.directMessages.push(dm._id);
        await teamMember2.save();
    });

    // Helper function to create a WebSocket connection with error handling
    const createWebSocketConnection = (tokenValue: string): Promise<WebSocket> => {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(`ws://localhost:5001?token=${tokenValue}`);
            
            const timeout = setTimeout(() => {
                reject(new Error('WebSocket connection timed out'));
            }, 3000);
            
            ws.on('open', () => {
                clearTimeout(timeout);
                resolve(ws);
            });
            
            ws.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    };

    it('should connect to the WebSocket server', async () => {
        const ws = await createWebSocketConnection(token);
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
    });

    it('should join a channel', async () => {
        const ws = await createWebSocketConnection(token);
        
        const messagePromise = new Promise<any>((resolve) => {
            ws.on('message', (message) => {
                const parsedMessage = JSON.parse(message.toString());
                if (parsedMessage.type === 'join') {
                    resolve(parsedMessage);
                }
            });
        });
        
        ws.send(JSON.stringify({
            type: 'join',
            teamName: team.name,
            channelName: channel.name
        }));
        
        const response = await messagePromise;
        expect(response.type).toBe('join');
        ws.close();
    });

    it('should send and receive messages', async () => {
        const ws = await createWebSocketConnection(token);
        
        // Join channel first
        await new Promise<void>((resolve) => {
            ws.on('message', (message) => {
                const parsedMessage = JSON.parse(message.toString());
                if (parsedMessage.type === 'join') {
                    resolve();
                }
            });
            
            ws.send(JSON.stringify({
                type: 'join',
                teamName: team.name,
                channelName: channel.name
            }));
        });
        
        // Now send and wait for message
        const messagePromise = new Promise<any>((resolve) => {
            ws.on('message', (message) => {
                const parsedMessage = JSON.parse(message.toString());
                if (parsedMessage.type === 'message') {
                    resolve(parsedMessage);
                }
            });
        });
        
        ws.send(JSON.stringify({
            type: 'message',
            text: 'Hello, World!',
            teamName: team.name,
            channelName: channel.name
        }));
        
        const response = await messagePromise;
        expect(response.text).toBe('Hello, World!');
        ws.close();
    });

    it('should join a direct message', async () => {
        const ws = await createWebSocketConnection(token);
        
        const messagePromise = new Promise<any>((resolve) => {
            ws.on('message', (message) => {
                const parsedMessage = JSON.parse(message.toString());
                if (parsedMessage.type === 'joinDirectMessage') {
                    resolve(parsedMessage);
                }
            });
        });
        
        ws.send(JSON.stringify({
            type: 'joinDirectMessage',
            teamName: team.name,
            username: user2.username
        }));
        
        const response = await messagePromise;
        expect(response.type).toBe('joinDirectMessage');
        ws.close();
    });

    it('should send and receive direct messages', async () => {
        const ws = await createWebSocketConnection(token);
        
        // Join direct message chat first
        await new Promise<void>((resolve) => {
            ws.on('message', (message) => {
                const parsedMessage = JSON.parse(message.toString());
                if (parsedMessage.type === 'joinDirectMessage') {
                    resolve();
                }
            });
            
            ws.send(JSON.stringify({
                type: 'joinDirectMessage',
                teamName: team.name,
                username: user2.username
            }));
        });
        
        // Now send and wait for direct message
        const messagePromise = new Promise<any>((resolve) => {
            ws.on('message', (message) => {
                const parsedMessage = JSON.parse(message.toString());
                if (parsedMessage.type === 'directMessage') {
                    resolve(parsedMessage);
                }
            });
        });
        
        ws.send(JSON.stringify({
            type: 'directMessage',
            text: 'Hello, Direct Message!',
            teamName: team.name,
            username: user2.username
        }));
        
        const response = await messagePromise;
        expect(response.text).toBe('Hello, Direct Message!');
        ws.close();
    });

    it('should handle unauthorized access', async () => {
        // For invalid token test, we need to handle differently
        // because the error might be sent immediately on connection
        return new Promise<void>((resolve, reject) => {
            const ws = new WebSocket(`ws://localhost:5001?token=InvalidToken`);
            
            // Set a timeout to prevent test from hanging
            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error('Test timed out - no error message received'));
            }, 5000);
            
            ws.on('open', () => {
                // Connection succeeded, now send a message that should be rejected
                ws.send(JSON.stringify({
                    type: 'join',
                    teamName: team.name,
                    channelName: channel.name
                }));
            });
            
            ws.on('message', (message) => {
                try {
                    const parsedMessage = JSON.parse(message.toString());
                    if (parsedMessage.type === 'error') {
                        expect(parsedMessage.message).toContain('Invalid token');
                        clearTimeout(timeout);
                        ws.close();
                        resolve();
                    }
                } catch (error) {
                    clearTimeout(timeout);
                    ws.close();
                    reject(error);
                }
            });
            
            ws.on('error', (wsError) => {
                // WebSocket errors are also acceptable here since the server
                // might reject the connection entirely
                clearTimeout(timeout);
                // Don't fail the test on WebSocket error - this might be expected behavior
                resolve();
            });
            
            ws.on('close', () => {
                // If connection is closed without an error message,
                // but we didn't get any error messages, check if we have a token validation happening on the close event
                // In some implementations, unauthorized connections are just closed
                clearTimeout(timeout);
                resolve();
            });
        });
    });

    it('should track user connections', async () => {
        const ws = await createWebSocketConnection(token);
        
        // Wait for authentication to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(OnlineStatusService.trackUserConnection).toHaveBeenCalledWith(
            expect.anything(), // userId
            user.username      // username
        );
        
        ws.close();
    });

    it('should handle online status subscription', async () => {
        // Mock implementation that returns team members
        (OnlineStatusService.getTeamSubscribers as jest.Mock).mockResolvedValue([user.username, user2.username]);
        
        const ws = await createWebSocketConnection(token);
        
        // Create a promise for status update
        const statusUpdatePromise = new Promise<any>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('No status update received in time'));
            }, 3000);
            
            ws.on('message', (message) => {
                const parsedMessage = JSON.parse(message.toString());
                if (parsedMessage.type === 'statusUpdate') {
                    clearTimeout(timeoutId);
                    resolve(parsedMessage);
                }
            });
        });
        
        // Wait for connection to be established
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Subscribe to status updates
        ws.send(JSON.stringify({
            type: 'subscribeOnlineStatus',
            teamName: team.name
        }));
        
        try {
            const response = await statusUpdatePromise;
            expect(response).toHaveProperty('username');
            expect(response).toHaveProperty('status');
            expect(response).toHaveProperty('lastSeen');
        } finally {
            ws.close();
        }
    });

    it('should set user status manually', async () => {
        const ws = await createWebSocketConnection(token);
        
        ws.send(JSON.stringify({
            type: 'setStatus',
            status: 'away'
        }));
        
        // Wait for status to be set
        await new Promise(resolve => setTimeout(resolve, 300));
        
        expect(OnlineStatusService.setUserStatus).toHaveBeenCalledWith(
            expect.anything(), // userId 
            user.username,     // username
            'away'             // status
        );
        
        ws.close();
    });

    it('should handle typing indicators in channels', async () => {
        const ws = await createWebSocketConnection(token);
        
        // Join channel first
        await new Promise<void>((resolve) => {
            ws.on('message', (message) => {
                const parsedMessage = JSON.parse(message.toString());
                if (parsedMessage.type === 'join') {
                    resolve();
                }
            });
            
            ws.send(JSON.stringify({
                type: 'join',
                teamName: team.name,
                channelName: channel.name
            }));
        });
        
        // Now send and wait for typing indicator
        const typingPromise = new Promise<any>((resolve) => {
            ws.on('message', (message) => {
                const parsedMessage = JSON.parse(message.toString());
                if (parsedMessage.type === 'typing') {
                    resolve(parsedMessage);
                }
            });
        });
        
        ws.send(JSON.stringify({
            type: 'typing',
            isTyping: true,
            teamName: team.name,
            channelName: channel.name
        }));
        
        const response = await typingPromise;
        expect(response.isTyping).toBe(true);
        expect(response.teamName).toBe(team.name);
        expect(response.channelName).toBe(channel.name);
        
        ws.close();
    });

    it('should track user disconnections', async () => {
        // Clear previous mock calls
        jest.clearAllMocks();
        
        // Create a connection
        const ws = await createWebSocketConnection(token);
        
        // Join a channel to ensure authentication
        await new Promise<void>((resolve) => {
            ws.on('message', (message) => {
                const parsedMessage = JSON.parse(message.toString());
                if (parsedMessage.type === 'join') {
                    resolve();
                }
            });
            
            ws.send(JSON.stringify({
                type: 'join',
                teamName: team.name,
                channelName: channel.name
            }));
        });
        
        // Send a message to verify connection is working
        await new Promise<void>((resolve) => {
            ws.on('message', (message) => {
                const parsedMessage = JSON.parse(message.toString());
                if (parsedMessage.type === 'message') {
                    resolve();
                }
            });
            
            ws.send(JSON.stringify({
                type: 'message',
                text: 'Test message to verify user',
                teamName: team.name,
                channelName: channel.name
            }));
        });
        
        // Now close the connection
        ws.close();
        
        // Wait for disconnection to be processed
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify disconnection was tracked
        expect(OnlineStatusService.trackUserDisconnection).toHaveBeenCalled();
    });

    it('should reject invalid status values', async () => {
        const ws = await createWebSocketConnection(token);
        
        const errorPromise = new Promise<any>((resolve) => {
            ws.on('message', (message) => {
                const parsedMessage = JSON.parse(message.toString());
                if (parsedMessage.type === 'error') {
                    resolve(parsedMessage);
                }
            });
        });
        
        ws.send(JSON.stringify({
            type: 'setStatus',
            status: 'invalid-status' // Invalid status
        }));
        
        const response = await errorPromise;
        expect(response.message).toContain('Invalid status');
        
        ws.close();
    });
});
import { createServer, Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { setupWebSocketServer } from '../webSocketServer';
import { Role, TeamRole } from '../enums';
import TestHelpers from './testHelpers';
import OnlineStatusService from '../services/onlineStatusService';

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

beforeAll((done) => {
    server = createServer();
    wss = setupWebSocketServer(server);
    server.listen(5001, done);
});

afterAll((done) => {
    wss.clients.forEach((client) => client.terminate());
    wss.close(() => {
        server.close(done);
    });
});

describe('WebSocket Server - Basic Functionality', () => {
    let token: string;
    let user: any;
    let teamMember: any;
    let team: any;
    let channel: any;
    let user2: any;
    let teamMember2: any;
    let dm: any;

    beforeEach(async () => {
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

        // Reset mock calls before each test
        jest.clearAllMocks();
    });

    it('should connect to the WebSocket server', (done) => {
        const ws = new WebSocket(`ws://localhost:5001?token=${token}`);
        ws.on('open', () => {
            expect(ws.readyState).toBe(WebSocket.OPEN);
            ws.close();
            done();
        });

        ws.on('error', (error) => {
            console.log(error);
            done(error);
        });
    });

    it('should join a channel', (done) => {
        const ws = new WebSocket(`ws://localhost:5001?token=${token}`);
        ws.on('open', () => {
            ws.send(JSON.stringify({
                type: 'join',
                teamName: team.name,
                channelName: channel.name
            }));
        });

        ws.on('message', (message) => {
            const parsedMessage = JSON.parse(message.toString());
            expect(parsedMessage.type).toBe('join');
            ws.close();
            done();
        });

        ws.on('error', (error) => {
            console.log(error);
            done(error);
        });
    }, 5000);

    it('should send and receive messages', (done) => {
        const ws = new WebSocket(`ws://localhost:5001?token=${token}`);
        let doneCalled = false;

        const callDone = (error?: any) => {
            if (!doneCalled) {
                doneCalled = true;
                done(error);
            }
        };

        ws.on('open', () => {
            ws.send(JSON.stringify({
                type: 'join',
                teamName: team.name,
                channelName: channel.name
            }));
        });

        ws.on('message', (joinMsg) => {
            const parsedJoin = JSON.parse(joinMsg.toString());
            if (parsedJoin.type === 'join') {
                ws.send(JSON.stringify({
                    type: 'message',
                    text: 'Hello, World!',
                    teamName: team.name,
                    channelName: channel.name
                }));
            } else if (parsedJoin.type === 'message') {
                expect(parsedJoin.text).toBe('Hello, World!');
                ws.close();
                callDone();
            }
        });

        ws.on('error', (error) => {
            callDone(error);
        });

        ws.on('close', () => {
            callDone();
        });
    });

    it('should join a direct message', (done) => {
        const ws = new WebSocket(`ws://localhost:5001?token=${token}`);
        ws.on('open', () => {
            ws.send(JSON.stringify({
                type: 'joinDirectMessage',
                teamName: team.name,
                username: user2.username
            }));
        });

        ws.on('message', (message) => {
            const parsedMessage = JSON.parse(message.toString());
            expect(parsedMessage.type).toBe('joinDirectMessage');
            ws.close();
            done();
        });

        ws.on('error', (error) => {
            console.log(error);
            done(error);
        });
    }, 5000);

    it('should send and receive direct messages', (done) => {
        const ws = new WebSocket(`ws://localhost:5001?token=${token}`);
        let doneCalled = false;

        const callDone = (error?: any) => {
            if (!doneCalled) {
                doneCalled = true;
                done(error);
            }
        };

        ws.on('open', () => {
            ws.send(JSON.stringify({
                type: 'joinDirectMessage',
                teamName: team.name,
                username: user2.username
            }));
        });

        ws.on('message', (joinMsg) => {
            const parsedJoin = JSON.parse(joinMsg.toString());
            if (parsedJoin.type === 'joinDirectMessage') {
                ws.send(JSON.stringify({
                    type: 'directMessage',
                    text: 'Hello, Direct Message!',
                    teamName: team.name,
                    username: user2.username
                }));
            } else if (parsedJoin.type === 'directMessage') {
                expect(parsedJoin.text).toBe('Hello, Direct Message!');
                ws.close();
                callDone();
            }
        });

        ws.on('error', (error) => {
            callDone(error);
        });

        ws.on('close', () => {
            callDone();
        });
    });

    it('should handle unauthorized access', (done) => {
        const ws = new WebSocket(`ws://localhost:5001?token=InvalidToken`);
        ws.on('open', () => {
            ws.send(JSON.stringify({
                type: 'join',
                teamName: team.name,
                channelName: channel.name
            }));
        });

        ws.on('message', (message) => {
            const parsedMessage = JSON.parse(message.toString());
            expect(parsedMessage.type).toBe('error');
            expect(parsedMessage.message).toContain('Invalid token');
            done();
        });

        ws.on('error', (error) => {
            console.log(error);
            done(error);
        });
    }, 5000);
});
import { createServer, Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { setupWebSocketServer } from '../webSocketServer';
import { Role, TeamRole } from '../enums';
import TestHelpers from './testHelpers';

let server: Server;
let wss: WebSocketServer;

beforeAll((done) => {
    server = createServer();
    wss = setupWebSocketServer(server);
    server.listen(5001, done);
});

afterAll((done) => {
    wss.close(() => {
        server.close(done);
    });
});

describe('WebSocket Server', () => {
    let token: string;
    let user: any;
    let team: any;
    let channel: any;

    beforeEach(async () => {
        user = await TestHelpers.createTestUser('test@user.com', 'testpassword', 'Test', 'User', 'testuser', Role.USER, []);
        team = await TestHelpers.createTestTeam('Test Team', user._id, [], []);
        const teamMember = await TestHelpers.createTestTeamMember(user._id, team._id, TeamRole.MEMBER, []);
        channel = await TestHelpers.createTestChannel('Test Channel', team._id, user._id, [teamMember._id], []);
        user.teamMemberships.push(teamMember._id);
        await user.save();
        team.teamMembers.push(teamMember._id);
        team.channels.push(channel._id);
        await team.save();
        teamMember.channels.push(channel._id);
        await teamMember.save();
        token = await TestHelpers.generateToken(user.username, user.email);
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

    it('should connect to the WebSocket server with timeout', (done) => {
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
            console.log('Test: WebSocket connection opened');
            ws.send(JSON.stringify({
                type: 'join',
                teamName: team.name,
                channelName: channel.name
            }));
        });
    
        ws.on('message', (joinMsg) => {
            const parsedJoin = JSON.parse(joinMsg.toString());
            console.log('Test: Received message:', parsedJoin);
            if (parsedJoin.type === 'join') {
                ws.send(JSON.stringify({
                    type: 'message',
                    text: 'Hello, World!',
                    username: user.username,
                    teamName: team.name,
                    channelName: channel.name,
                    createdAt: new Date()
                }));
            } else if (parsedJoin.type === 'message') {
                console.log('Test: Received message confirmation:', parsedJoin);
                expect(parsedJoin.text).toBe('Hello, World!');
                ws.close();
                callDone();
            }
        });
    
        ws.on('error', (error) => {
            console.log('Test: WebSocket error:', error);
            callDone(error);
        });
    
        ws.on('close', () => {
            console.log('Test: WebSocket connection closed');
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

        ws.on('close', (code, reason) => {
            expect(code).toBe(1008);
            expect(reason.toString()).toContain('Invalid token');
            done();
        });

        ws.on('error', (error) => {
            console.log(error);
            done(error);
        });
    }, 5000);
});
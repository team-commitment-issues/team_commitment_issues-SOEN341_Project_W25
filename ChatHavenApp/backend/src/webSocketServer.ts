import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { Schema, Types } from 'mongoose';
import ChannelService from './services/channelService';
import DirectMessageService from './services/directMessageService';
import OnlineStatusService from './services/onlineStatusService';
import User, { IUser } from './models/User';
import Team, { ITeam } from './models/Team';
import TeamMember, { ITeamMember } from './models/TeamMember';
import Channel, { IChannel } from './models/Channel';
import DirectMessage, { IDirectMessage } from './models/DirectMessage';
import { Role, Status } from './enums';
import { setTimeout } from 'timers/promises';

interface ExtendedWebSocket extends WebSocket {
    team: ITeam;
    channel?: IChannel;
    user: IUser;
    teamMember?: ITeamMember;
    receiver?: IUser;
    directMessage?: IDirectMessage;
    subscribedTeams?: Set<string>;
}

interface DecodedToken {
    username: string;
    email: string;
}

const DEBUG = true;

const handleDisconnection = async (userId: Schema.Types.ObjectId, username: string, wss: WebSocketServer) => {
    // Wait for 5 seconds to check if the user reconnects
    await setTimeout(5000);

    // Re-check the user's status
    const user = await User.findById(userId);
    if (user && user.status === Status.OFFLINE) {
        // Broadcast the offline status
        await broadcastStatusUpdate(wss, username, Status.OFFLINE, new Date());
    }
};

const verifyToken = async (token: string) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
        const user = await User.findOne({ username: decoded.username });
        if (!user) throw new Error('User not found');
        return user;
    } catch (err) {
        const error = new Error('Invalid token');
        error.message = 'InvalidTokenError';
        throw error;
    }
};

const findTeamAndChannel = async (teamName: string, channelName: string, userId: Schema.Types.ObjectId, userRole: Role) => {
    const team = await Team.findOne({ name: teamName });
    if (!team) throw new Error('Team not found');

    let teamMember;
    if (userRole !== Role.SUPER_ADMIN) {
        teamMember = await TeamMember.findOne({ user: userId, team: team._id });
        if (!teamMember) throw new Error('Team member not found');
    }

    const channel = await Channel.findOne({ name: channelName, team: team._id });
    if (!channel) throw new Error('Channel not found');

    return { team, teamMember, channel };
};

const authorizeUserForChannel = async (ws: ExtendedWebSocket, parsedMessage: any, token: string) => {
    let user;
    try {
        user = await verifyToken(token);
        ws.user = user;
    } catch (err) {
        throw err;
    }

    const { team, teamMember, channel } = await findTeamAndChannel(parsedMessage.teamName, parsedMessage.channelName, user._id as Schema.Types.ObjectId, user.role);
    ws.team = team;
    if (user.role !== Role.SUPER_ADMIN && teamMember) ws.teamMember = teamMember;
    ws.channel = channel;

    const isMember = (ws.channel.members).some((member) => member.toString() === ws.teamMember?._id?.toString());
    const hasPermission = user.role === 'SUPER_ADMIN' || teamMember?.role === 'ADMIN';

    if (!isMember && !hasPermission) {
        if (DEBUG) {
            console.error('Unauthorized access attempt', {
                isMember,
                hasPermission,
                userRole: user.role,
                teamMemberRole: teamMember?.role,
                channelMembers: channel.members.map((member) => member.toString()),
                teamMemberId: teamMember?._id
            });
        }
        ws.close(3000, 'Unauthorized');
        throw new Error('Unauthorized');
    }
};

const findOrCreateDirectMessage = async (userId: Schema.Types.ObjectId, teamName: string, username: string) => {
    const team = await Team.findOne({ name: teamName });
    if (!team) throw new Error(`Team with name "${teamName}" not found`);

    const user1 = await User.findById(userId);
    if (!user1) throw new Error(`User with ID "${userId}" not found`);
    if (user1.role !== 'SUPER_ADMIN') {
        const teamMember = await TeamMember.findOne({ user: userId, team: team._id });
        if (!teamMember) throw new Error(`Team member with user ID "${userId}" not found in team "${teamName}"`);
    }

    const user2 = await User.findOne({ username });
    if (!user2) throw new Error(`User with username "${username}" not found`);
    if (user2.role !== 'SUPER_ADMIN') {
        const teamMember = await TeamMember.findOne({ user: user2._id, team: team._id });
        if (!teamMember) throw new Error(`Team member with username "${username}" not found in team "${teamName}"`);
    }

    // Try to find an existing direct message or create a new one
    let directMessage = await DirectMessage.findOne({ 
        users: { $all: [user1._id, user2._id] }
    });
    
    if (!directMessage) {
        // Create a new direct message
        if (DEBUG) {
            console.log(`Creating new direct message between ${user1.username} and ${user2.username}`);
        }
        directMessage = await DirectMessageService.createDirectMessage(user1.username, user2._id as Schema.Types.ObjectId, team._id as Schema.Types.ObjectId);
    }

    return { team, receiver: user2, directMessage };
};

// New function to broadcast status updates
const broadcastStatusUpdate = async (wss: WebSocketServer, username: string, status: Status, lastSeen: Date) => {
    const user = await User.findOne({ username });
    if (!user) return;
    
    // Get all teams this user belongs to
    const teamIds = await OnlineStatusService.getUserTeams(user._id as Schema.Types.ObjectId);
    
    // For each team, get subscribers and send the status update
    const subscribers = new Set<string>();
    
    for (const teamId of teamIds) {
        const teamSubscribers = await OnlineStatusService.getTeamSubscribers(teamId);
        teamSubscribers.forEach(sub => subscribers.add(sub));
    }
    
    // Format the status update
    const statusUpdate = {
        type: 'statusUpdate',
        username,
        status,
        lastSeen: lastSeen.toISOString()
    };
    
    // Send to all connected clients who are subscribed
    wss.clients.forEach((client) => {
        const extendedClient = client as ExtendedWebSocket;
        
        if (extendedClient.readyState === WebSocket.OPEN && 
            extendedClient.user && 
            subscribers.has(extendedClient.user.username)) {
            
            extendedClient.send(JSON.stringify(statusUpdate));
        }
    });
};

const handleWebSocketMessage = async (ws: ExtendedWebSocket, parsedMessage: any, wss: WebSocketServer, token: string, messageType: string) => {
    try {
        if (messageType === 'join' || messageType === 'message') {
            await authorizeUserForChannel(ws, parsedMessage, token);
        } else if (messageType === 'directMessage' || messageType === 'joinDirectMessage') {
            const user = await verifyToken(token);
            ws.user = user;
            if (DEBUG) {
                console.log("ParsedMessage: ", parsedMessage);
            }

            const userId = user._id as Schema.Types.ObjectId;
            const { team, receiver, directMessage } = await findOrCreateDirectMessage(userId, parsedMessage.teamName, parsedMessage.username);
            ws.team = team;
            ws.receiver = receiver;
            ws.directMessage = directMessage;
            
            if (messageType === 'directMessage') {
                const message = await DirectMessageService.sendDirectMessage(parsedMessage.text, user.username, directMessage._id as Types.ObjectId);
                const formattedMessage = {
                    type: 'directMessage',
                    _id: message._id,
                    text: message.text,
                    username: message.username,
                    createdAt: message.createdAt,
                };
                wss.clients.forEach((client) => {
                    const extendedClient = client as ExtendedWebSocket;
                    if (extendedClient.readyState === ws.OPEN && extendedClient.directMessage === ws.directMessage) {
                        extendedClient.send(JSON.stringify(formattedMessage));
                    }
                });
            } else if (messageType === 'joinDirectMessage') {
                ws.send(JSON.stringify({ 
                    type: 'joinDirectMessage', 
                    teamName: team.name, 
                    username: parsedMessage.username,
                    directMessageId: directMessage._id
                }));
                if (DEBUG) {
                    console.log(`User ${user.username} joined direct message with ${parsedMessage.username}`);
                }
            }
        } else if (messageType === 'ping') {
            // Handle ping messages for keeping the connection alive
            ws.send(JSON.stringify({ type: 'pong' }));
        } 
        // New message types for online status
        else if (messageType === 'subscribeOnlineStatus') {
            const user = await verifyToken(token);
            ws.user = user;
            
            // Initialize the set if not already done
            if (!ws.subscribedTeams) {
                ws.subscribedTeams = new Set();
            }
            
            const { teamName } = parsedMessage;
            const team = await Team.findOne({ name: teamName });
            
            if (!team) {
                throw new Error(`Team with name "${teamName}" not found`);
            }
            
            // Add to subscribed teams
            ws.subscribedTeams.add(teamName);
            
            // Get members of this team
            const members = await OnlineStatusService.getTeamSubscribers(team._id as Schema.Types.ObjectId);
            
            // Get status for all team members
            const statuses = await OnlineStatusService.getUserOnlineStatus(members);
            
            // Send current status to client
            for (const status of statuses) {
                ws.send(JSON.stringify({
                    type: 'statusUpdate',
                    username: status.username,
                    status: status.status,
                    lastSeen: status.lastSeen.toISOString()
                }));
            }
        } else if (messageType === 'setStatus') {
            const user = await verifyToken(token);
            ws.user = user;
            
            const { status } = parsedMessage;
            // make sure the status is valid
            if (!Object.values(Status).includes(status)) {
                throw new Error('Invalid status');
            }
            
            const userStatus = await OnlineStatusService.setUserStatus(
                user._id as Schema.Types.ObjectId, 
                user.username, 
                status as Status
            );
            
            // Broadcast to all subscribers
            await broadcastStatusUpdate(wss, user.username, status as Status, userStatus.lastSeen);
        } else if (messageType === 'typing') {
            // Forward typing indicators
            const user = await verifyToken(token);
            
            if (parsedMessage.channelName) {
                // Channel typing indicator
                wss.clients.forEach((client) => {
                    const extendedClient = client as ExtendedWebSocket;
                    if (extendedClient.readyState === WebSocket.OPEN && 
                        extendedClient.channel && 
                        extendedClient.channel.name === parsedMessage.channelName &&
                        extendedClient.team && 
                        extendedClient.team.name === parsedMessage.teamName) {
                        
                        extendedClient.send(JSON.stringify({
                            type: 'typing',
                            username: user.username,
                            isTyping: parsedMessage.isTyping,
                            teamName: parsedMessage.teamName,
                            channelName: parsedMessage.channelName
                        }));
                    }
                });
            } else if (parsedMessage.receiverUsername) {
                // Direct message typing indicator
                wss.clients.forEach((client) => {
                    const extendedClient = client as ExtendedWebSocket;
                    if (extendedClient.readyState === WebSocket.OPEN && 
                        extendedClient.user &&
                        (extendedClient.user.username === parsedMessage.receiverUsername || 
                         extendedClient.user.username === user.username)) {
                        
                        extendedClient.send(JSON.stringify({
                            type: 'typing',
                            username: user.username,
                            isTyping: parsedMessage.isTyping,
                            teamName: parsedMessage.teamName,
                            receiverUsername: parsedMessage.receiverUsername
                        }));
                    }
                });
            }
        }

        if (messageType === 'join') {
            ws.send(JSON.stringify({ type: 'join', teamName: ws.team.name, channelName: ws.channel?.name }));
        } else if (messageType === 'message') {
            if (!ws.channel) {
                throw new Error('No channel selected');
            }
            
            let message;
            if (ws.user.role === 'SUPER_ADMIN') {
                message = await ChannelService.sendMessage(ws.channel._id as Types.ObjectId, ws.user.username as string, parsedMessage.text);
            } else {
                message = await ChannelService.sendMessage(ws.channel._id as Types.ObjectId, ws.teamMember?._id as Types.ObjectId, parsedMessage.text);
            }
            const formattedMessage = {
                type: 'message',
                _id: message._id as string,
                text: message.text as string,
                username: message.username as string,
                createdAt: message.createdAt as Date,
            };
            wss.clients.forEach((client) => {
                const extendedClient = client as ExtendedWebSocket;
                if (extendedClient.readyState === ws.OPEN && extendedClient.channel === ws.channel && extendedClient.team === ws.team) {
                    extendedClient.send(JSON.stringify(formattedMessage));
                }
            });
        }
    } catch (err) {
        const errorMessage = (err instanceof Error) ? err.message : 'Unknown error';
        if (DEBUG) {
            console.error(`Error handling ${messageType}: ${errorMessage}`);
        }
        ws.send(JSON.stringify({ type: 'error', message: errorMessage }));
    }
};

export const setupWebSocketServer = (server: any): WebSocketServer => {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws: ExtendedWebSocket, req) => {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const token = url.searchParams.get('token') as string;
        if (DEBUG) {
            console.log('Server: WebSocket connection established with token:', token);
        }
        if (!token) {
            if (DEBUG) {
                console.error('Server: No token provided');
            }
            ws.close(1000, 'No token provided');
            return;
        }

        // Initialize status tracking
        verifyToken(token).then(user => {
            if (DEBUG) {
                console.log(`Server: User ${user.username} authenticated successfully`);
            }
            
            // Track that this user is now connected
            OnlineStatusService.trackUserConnection(user._id as Schema.Types.ObjectId, user.username);
            
            // Broadcast the online status to other users
            const now = new Date();
            broadcastStatusUpdate(wss, user.username, Status.ONLINE, now);
            
        }).catch(err => {
            if (DEBUG) {
                console.error('Server: Authentication error:', err.message);
            }
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
            ws.close(1000, 'Invalid token');
        });

        ws.on('message', async (message) => {
            try {
                const parsedMessage = JSON.parse(message.toString());
                if (DEBUG) {
                    console.log('Server: Received message:', parsedMessage);
                }

                if ([
                    'join', 
                    'message', 
                    'directMessage', 
                    'joinDirectMessage', 
                    'ping', 
                    'subscribeOnlineStatus', 
                    'setStatus',
                    'typing'
                ].includes(parsedMessage.type)) {
                    await handleWebSocketMessage(ws, parsedMessage, wss, token, parsedMessage.type);
                } else {
                    if (DEBUG) {
                        console.error('Server: Unknown message type:', parsedMessage.type);
                    }
                }
            } catch (error) {
                if (DEBUG) {
                    console.error('Server: WebSocket message handling error:', error);
                }
                ws.send(JSON.stringify({ type: 'error', message: 'Message handling error' }));
            }
        });

        ws.on('close', (code, reason) => {
            if (DEBUG) {
                console.log(`WebSocket connection closed with code ${code}, reason: ${reason}`);
            }
        
            if (ws.user) {
                OnlineStatusService.trackUserDisconnection(ws.user._id as Schema.Types.ObjectId, ws.user.username);
        
                try {
                    handleDisconnection(ws.user._id as Schema.Types.ObjectId, ws.user.username, wss);
                } catch (error) {
                    if (DEBUG) {
                        console.error('Error handling disconnection:', error);
                    }
                    ws.send(JSON.stringify({ type: 'error', message: 'Error handling disconnection' }));
                }
            }
        });
        
        ws.on('error', (error) => {
            if (DEBUG) {
                console.error('Server: WebSocket error:', error);
            }
            ws.send(JSON.stringify({ type: 'error', message: 'WebSocket error' }));
        });
    });
/*
    // Set up periodic cleaning of stale users
    setInterval(() => {
        OnlineStatusService.clearStaleUsers();
    }, 24 * 60 * 60 * 1000); // Run daily
*/
    return wss;
};
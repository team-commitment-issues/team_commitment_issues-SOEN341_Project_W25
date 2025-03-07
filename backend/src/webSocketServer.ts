import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { Schema, Types } from 'mongoose';
import ChannelService from './services/channelService';
import DirectMessageService from './services/directMessageService';
import User, { IUser } from './models/User';
import Team, { ITeam } from './models/Team';
import TeamMember, { ITeamMember } from './models/TeamMember';
import Channel, { IChannel } from './models/Channel';
import DirectMessage, { IDirectMessage } from './models/DirectMessage';

interface ExtendedWebSocket extends WebSocket {
    team: ITeam;
    channel: IChannel;
    user: IUser;
    teamMember: ITeamMember;
    directMessage: IDirectMessage;
}

interface DecodedToken {
    username: string;
    email: string;
}

const DEBUG = false; // Set this to false to disable debug logs

const verifyToken = async (token: string) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
        const user = await User.findOne({ username: decoded.username });
        if (!user) throw new Error('User not found');
        return user;
    } catch (err) {
        throw new Error('Invalid token');
    }
};

const findTeamAndChannel = async (teamName: string, channelName: string, userId: Schema.Types.ObjectId) => {
    const team = await Team.findOne({ name: teamName });
    if (!team) throw new Error('Team not found');

    const teamMember = await TeamMember.findOne({ user: userId, team: team._id });
    if (!teamMember) throw new Error('Team member not found');

    const channel = await Channel.findOne({ name: channelName, team: team._id });
    if (!channel) throw new Error('Channel not found');

    return { team, teamMember, channel };
};

const handleJoinMessage = async (ws: ExtendedWebSocket, req: any, parsedMessage: any, token: string) => {
    try {
        const user = await verifyToken(token);
        if (!user) throw new Error('User not found');
        ws.user = user;

        const { team, teamMember, channel } = await findTeamAndChannel(parsedMessage.teamName, parsedMessage.channelName, user._id as Schema.Types.ObjectId);
        ws.team = team;
        ws.teamMember = teamMember;
        ws.channel = channel;
        if (!ws.team || !ws.teamMember || !ws.channel) throw new Error('Team, team member, or channel not found');

        const isMember = (ws.channel.members).some((member) => member.toString() === ws.teamMember?._id?.toString());
        const hasPermission = user.role === 'SUPER_ADMIN' || teamMember.role === 'ADMIN';

        if (!isMember && !hasPermission) {
            if (DEBUG) {
                console.error('Unauthorized access attempt', {
                    isMember,
                    hasPermission,
                    userRole: user.role,
                    teamMemberRole: teamMember.role,
                    channelMembers: channel.members.map((member) => member.toString()),
                    teamMemberId: teamMember._id
                });
            }
            ws.close(1008, 'Unauthorized');
            return;
        }

        ws.send(JSON.stringify({ type: 'join', teamName: team.name, channelName: channel.name }));
    } catch (err) {
        const errorMessage = (err instanceof Error) ? err.message : 'Unknown error';
        if (DEBUG) {
            console.error(`Error joining channel: ${errorMessage}`);
        }
        ws.close(1008, errorMessage);
    }
};

const handleJoinDirectMessage = async (ws: ExtendedWebSocket, parsedMessage: any, token: string) => {
    try {
        const user = await verifyToken(token);
        if (!user) throw new Error('User not found');
        ws.user = user;

        const userId = user._id as Schema.Types.ObjectId;
        const { team, teamMember, directMessage } = await findTeamAndTeamMemberAndDirectMessage(userId, parsedMessage.teamName, parsedMessage.username);
        ws.team = team;
        ws.teamMember = teamMember;
        if (!ws.team || !ws.teamMember) throw new Error('Team or team member not found');
        if (!directMessage) throw new Error('Direct message not found');

        ws.send(JSON.stringify({ type: 'joinDirectMessage', teamName: team.name, username: parsedMessage.username }));
    } catch (err) {
        const errorMessage = (err instanceof Error) ? err.message : 'Unknown error';
        if (DEBUG) {
            console.error(`Error joining direct message: ${errorMessage}`);
        }
        ws.close(1008, errorMessage);
    }
};

const handleMessage = async (ws: ExtendedWebSocket, parsedMessage: any, wss: WebSocketServer, token: string) => {
    try {
        const user = await verifyToken(token);
        ws.user = user;
        if (DEBUG) {
            console.log("ParsedMessage: ", parsedMessage);
        }

        const { team, teamMember, channel } = await findTeamAndChannel(parsedMessage.teamName, parsedMessage.channelName, user._id as Schema.Types.ObjectId);
        ws.team = team;
        ws.teamMember = teamMember;
        ws.channel = channel;
        if (!ws.team || !ws.teamMember || !ws.channel) throw new Error('Team, team member, or channel not found');

        const isMember = (ws.channel.members).some((member) => member.toString() === ws.teamMember?._id?.toString());
        const hasPermission = user.role === 'SUPER_ADMIN' || teamMember.role === 'ADMIN';

        if (!isMember && !hasPermission) {
            if (DEBUG) {
                console.error('Unauthorized access attempt', {
                    isMember,
                    hasPermission,
                    userRole: user.role,
                    teamMemberRole: teamMember.role,
                    channelMembers: channel.members.map((member) => member.toString()),
                    teamMemberId: teamMember._id
                });
            }
            ws.close(1008, 'Unauthorized');
            return;
        }
        ChannelService.sendMessage(ws.channel._id as Types.ObjectId, ws.teamMember._id as Types.ObjectId, parsedMessage.text);
        wss.clients.forEach((client) => {
            const extendedClient = client as ExtendedWebSocket;
            if (extendedClient.readyState === ws.OPEN && extendedClient.channel === ws.channel && extendedClient.team === ws.team) {
                extendedClient.send(JSON.stringify(parsedMessage));
            }
        });
    } catch (err) {
        const errorMessage = (err instanceof Error) ? err.message : 'Unknown error';
        if (DEBUG) {
            console.error(`Error joining channel: ${errorMessage}`);
        }
        ws.close(1008, errorMessage);
    }
};

const findTeamAndTeamMemberAndDirectMessage = async (userId: Schema.Types.ObjectId, teamName: string, username: string) => {
    const team = await Team.findOne({ name: teamName });
    if (!team) throw new Error(`Team with name "${teamName}" not found`);

    const teamMember = await TeamMember.findOne({ user: userId, team: team._id });
    if (!teamMember) throw new Error(`Team member with user ID "${userId}" not found in team "${teamName}"`);

    const user2 = await User.findOne({ username });
    if (!user2) throw new Error(`User with username "${username}" not found`);

    const teamMember2 = await TeamMember.findOne({ user: user2._id, team: team._id });
    if (!teamMember2) throw new Error(`Team member with username "${username}" not found in team "${teamName}"`);

    const directMessage = await DirectMessage.findOne({ teamMembers: { $all: [teamMember._id, teamMember2._id] } });
    if (!directMessage) throw new Error(`Direct message between team members "${teamMember._id}" and "${teamMember2._id}" not found`);

    return { team, teamMember: teamMember2, directMessage };
}

const handleDirectMessage = async (ws: ExtendedWebSocket, parsedMessage: any, wss: WebSocketServer, token: string) => {
    try {
        const user = await verifyToken(token);
        ws.user = user;
        if (DEBUG) {
            console.log("ParsedMessage: ", parsedMessage);
        }

        const userId = user._id as Schema.Types.ObjectId;

        const { team, teamMember, directMessage } = await findTeamAndTeamMemberAndDirectMessage(userId, parsedMessage.teamName, parsedMessage.username);
        ws.team = team;
        ws.teamMember = teamMember;
        ws.directMessage = directMessage;
        if (!ws.team || !ws.teamMember) throw new Error('Team or team member not found');
        if (!ws.directMessage) throw new Error('Direct message not found');
        
        await DirectMessageService.sendDirectMessage(parsedMessage.text, user.username, directMessage._id as Types.ObjectId);

        wss.clients.forEach((client) => {
            const extendedClient = client as ExtendedWebSocket;
            if (extendedClient.readyState === ws.OPEN && extendedClient.directMessage === ws.directMessage) {
                extendedClient.send(JSON.stringify(parsedMessage));
            }
        });
    } catch (err) {
        const errorMessage = (err instanceof Error) ? err.message : 'Unknown error';
        if (DEBUG) {
            console.error(`Error sending direct message: ${errorMessage}`);
        }
        ws.close(1008, errorMessage);
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
            ws.close(1008, 'No token provided');
            return;
        }

        ws.on('message', async (message) => {
            try {
                const parsedMessage = JSON.parse(message.toString());
                if (DEBUG) {
                    console.log('Server: Received message:', parsedMessage);
                }

                if (parsedMessage.type === 'join') {
                    await handleJoinMessage(ws, req, parsedMessage, token);
                } else if (parsedMessage.type === 'message') {
                    await handleMessage(ws, parsedMessage, wss, token);
                } else if (parsedMessage.type === 'directMessage') {
                    await handleDirectMessage(ws, parsedMessage, wss, token);
                } else if (parsedMessage.type === 'joinDirectMessage') {
                    await handleJoinDirectMessage(ws, parsedMessage, token);
                }
            } catch (error) {
                if (DEBUG) {
                    console.error('Server: WebSocket message handling error:', error);
                }
                ws.close(1011, 'Message handling error');
            }
        });

        ws.on('close', () => {
            if (DEBUG) {
                console.log('Server: WebSocket connection closed');
            }
        });
    });

    return wss;
};
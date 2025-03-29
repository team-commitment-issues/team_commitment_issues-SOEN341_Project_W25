import { WebSocketServer, WebSocket } from 'ws';
import { Schema } from 'mongoose';
import { createLogger } from '../../utils/logger';
import User from '../../models/User';
import { Status } from '../../enums';
import OnlineStatusService from '../../services/onlineStatusService';
import { ExtendedWebSocket } from '../../types/websocket';

// Setup structured logging
const logger = createLogger('BroadcastUtils');

/**
 * Broadcasts status updates to all subscribed clients
 * @param wss WebSocket server
 * @param username Username
 * @param status User status
 * @param lastSeen Last seen timestamp
 */
export const broadcastStatusUpdate = async (
    wss: WebSocketServer,
    username: string,
    status: Status,
    lastSeen: Date
): Promise<void> => {
    try {
        const user = await User.findOne({ username }).exec();
        if (!user) return;

        // Get all teams this user belongs to
        const teamIds = await OnlineStatusService.getUserTeams(user._id as Schema.Types.ObjectId);

        // Collect all subscribers
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

        // Send to all subscribed clients
        let sentCount = 0;
        wss.clients.forEach(client => {
            const extendedClient = client as ExtendedWebSocket;

            if (
                extendedClient.readyState === WebSocket.OPEN &&
                extendedClient.user &&
                subscribers.has(extendedClient.user.username)
            ) {
                extendedClient.send(JSON.stringify(statusUpdate));
                sentCount++;
            }
        });

        logger.debug('Broadcast status update', { username, status, sentCount });
    } catch (error) {
        logger.error('Error broadcasting status update', { username, status, error });
    }
};

/**
 * Broadcasts a message to all clients in a channel
 * @param wss WebSocket server
 * @param teamId Team ID
 * @param channelId Channel ID
 * @param message Message to broadcast
 */
export const broadcastToChannel = (
    wss: WebSocketServer,
    teamId: Schema.Types.ObjectId,
    channelId: Schema.Types.ObjectId,
    message: any
): number => {
    let sentCount = 0;

    wss.clients.forEach(client => {
        const extendedClient = client as ExtendedWebSocket;

        if (
            extendedClient.readyState === WebSocket.OPEN &&
            extendedClient.channel &&
            extendedClient.team &&
            extendedClient.channel._id === channelId.toString() &&
            extendedClient.team._id === teamId.toString()
        ) {
            extendedClient.send(JSON.stringify(message));
            sentCount++;
        }
    });

    return sentCount;
};

/**
 * Broadcasts a message to specific users
 * @param wss WebSocket server
 * @param usernames Array of usernames to send the message to
 * @param message Message to broadcast
 */
export const broadcastToUsers = (
    wss: WebSocketServer,
    usernames: string[],
    message: any
): number => {
    let sentCount = 0;

    wss.clients.forEach(client => {
        const extendedClient = client as ExtendedWebSocket;

        if (
            extendedClient.readyState === WebSocket.OPEN &&
            extendedClient.user &&
            usernames.includes(extendedClient.user.username)
        ) {
            extendedClient.send(JSON.stringify(message));
            sentCount++;
        }
    });

    return sentCount;
};
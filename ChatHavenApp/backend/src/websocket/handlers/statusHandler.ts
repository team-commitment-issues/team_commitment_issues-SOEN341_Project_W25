import { WebSocketServer } from 'ws';
import { createLogger } from '../../utils/logger';
import { verifyToken } from '../middleware/authMiddleware';
import { ExtendedWebSocket, StatusMessage, OnlineStatusSubscription } from '../../types/websocket';
import { Status } from '../../enums';
import OnlineStatusService from '../../services/onlineStatusService';
import { broadcastStatusUpdate } from '../utils/broadcastUtils';
import Team from '../../models/Team';
import { ERROR_MESSAGES } from '../constants';
import { Schema } from 'mongoose';

// Setup structured logging
const logger = createLogger('StatusHandler');

/**
 * Handles ping messages (keep-alive)
 * @param ws WebSocket connection
 */
export const handlePing = async (ws: ExtendedWebSocket): Promise<void> => {
    ws.send(JSON.stringify({ type: 'pong' }));
};

/**
 * Handles online status subscription
 * @param ws WebSocket connection
 * @param message Online status subscription message
 * @param token JWT token
 */
export const handleSubscribeOnlineStatus = async (
    ws: ExtendedWebSocket,
    message: OnlineStatusSubscription,
    token: string
): Promise<void> => {
    const user = await verifyToken(token);
    ws.user = user;

    // Initialize the subscribed teams set
    if (!ws.subscribedTeams) {
        ws.subscribedTeams = new Set();
    }

    const { teamName } = message;
    const team = await Team.findOne({ name: teamName });

    if (!team) {
        throw new Error(ERROR_MESSAGES.TEAM_NOT_FOUND(teamName));
    }

    // Add to subscribed teams
    ws.subscribedTeams.add(teamName);

    // Get members of this team
    const members = await OnlineStatusService.getTeamSubscribers(team._id as Schema.Types.ObjectId);

    // Get status for all team members
    const statuses = await OnlineStatusService.getUserOnlineStatus(members);

    // Send current status to client
    for (const status of statuses) {
        ws.send(
            JSON.stringify({
                type: 'statusUpdate',
                username: status.username,
                status: status.status,
                lastSeen: status.lastSeen.toISOString()
            })
        );
    }

    logger.debug('Subscribed to online status', {
        username: user.username,
        teamName,
        memberCount: members.length
    });
};

/**
 * Handles status updates
 * @param ws WebSocket connection
 * @param message Status message
 * @param wss WebSocket server
 * @param token JWT token
 */
export const handleSetStatus = async (
    ws: ExtendedWebSocket,
    message: StatusMessage,
    wss: WebSocketServer,
    token: string
): Promise<void> => {
    const user = await verifyToken(token);
    ws.user = user;

    const { status } = message;
    // Validate status enum
    if (!Object.values(Status).includes(status)) {
        throw new Error(ERROR_MESSAGES.INVALID_STATUS);
    }

    const userStatus = await OnlineStatusService.setUserStatus(
        user._id as Schema.Types.ObjectId,
        user.username,
        status
    );

    // Broadcast to all subscribers
    await broadcastStatusUpdate(wss, user.username, status, userStatus.lastSeen);

    logger.debug('User status updated', {
        username: user.username,
        status
    });
};
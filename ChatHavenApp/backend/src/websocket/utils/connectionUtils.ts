import { WebSocketServer } from 'ws';
import { Schema } from 'mongoose';
import { setTimeout } from 'timers/promises';
import { createLogger } from '../../utils/logger';
import { Status } from '../../enums';
import OnlineStatusService from '../../services/onlineStatusService';
import { broadcastStatusUpdate } from './broadcastUtils';
import { CONFIG } from '../constants';

// Setup structured logging
const logger = createLogger('ConnectionUtils');

/**
 * Handles user disconnection by waiting for potential reconnection
 * before broadcasting offline status
 * @param userId User ID
 * @param username Username
 * @param wss WebSocket server
 */
export const handleDisconnection = async (
    userId: Schema.Types.ObjectId,
    username: string,
    wss: WebSocketServer
): Promise<void> => {
    try {
        // Wait for reconnection timeout
        await setTimeout(CONFIG.RECONNECT_TIMEOUT_MS);

        const connections = OnlineStatusService.getUserConnectionCount(username);

        if (connections === 0) {
            // Set status to offline and broadcast it
            await OnlineStatusService.setUserStatus(userId, username, Status.OFFLINE);
            await broadcastStatusUpdate(wss, username, Status.OFFLINE, new Date());
        }
    } catch (error) {
        logger.error('Error in disconnection handler', { userId, error });
    }
};
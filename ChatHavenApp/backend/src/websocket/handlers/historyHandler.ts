import { Types } from 'mongoose';
import { createLogger } from '../../utils/logger';
import { verifyToken, findTeamAndChannel } from '../middleware/authMiddleware';
import { ExtendedWebSocket, FetchHistoryMessage } from '../../types/websocket';
import ChannelService from '../../services/channelService';
import DirectMessageService from '../../services/directMessageService';
import { findOrCreateDirectMessage } from '../utils/messageUtils';
import { CONFIG, ERROR_MESSAGES } from '../constants';
import { Schema } from 'mongoose';

// Setup structured logging
const logger = createLogger('HistoryHandler');

/**
 * Handles fetching message history with pagination
 * @param ws WebSocket connection
 * @param message Fetch history message
 * @param token JWT token
 */
export const handleFetchHistory = async (
    ws: ExtendedWebSocket,
    message: FetchHistoryMessage,
    token: string
): Promise<void> => {
    const user = await verifyToken(token);
    ws.user = user;

    const { teamName, channelName, username, before, limit = 50, requestId } = message;
    const MAX_LIMIT = CONFIG.MAX_HISTORY_LIMIT;

    // Apply limit constraints
    const actualLimit = Math.min(limit, MAX_LIMIT);

    let messages: Array<{
        _id: string;
        text: string;
        username: string;
        createdAt: Date;
        status?: string;
        fileName?: string;
        fileType?: string;
        fileUrl?: string;
        fileSize?: number;
        quotedMessage?: {
            _id: string;
            text: string;
            username: string;
        };
    }> = [];
    let hasMore = false;

    try {
        if (channelName) {
            // Fetch channel messages with pagination
            const { team: _team, channel } = await findTeamAndChannel(
                teamName,
                channelName,
                user._id as Schema.Types.ObjectId,
                user.role
            );

            const messagesQuery = before
                ? { channel: channel._id, _id: { $lt: new Types.ObjectId(before) } }
                : { channel: channel._id };

            // Get messages with pagination
            messages = await ChannelService.getMessagesByCriteria(
                messagesQuery,
                actualLimit + 1 // Fetch one extra to determine if there are more
            );

            // Check if there are more messages
            if (messages.length > actualLimit) {
                hasMore = true;
                messages = messages.slice(0, actualLimit);
            }
        } else if (username) {
            // Fetch direct messages with pagination
            const { directMessage } = await findOrCreateDirectMessage(
                user._id as Schema.Types.ObjectId,
                teamName,
                username
            );

            const messagesQuery = before
                ? { directMessage: directMessage._id, _id: { $lt: new Types.ObjectId(before) } }
                : { directMessage: directMessage._id };

            // Get messages with pagination
            messages = await DirectMessageService.getMessagesByCriteria(
                messagesQuery,
                actualLimit + 1 // Fetch one extra to determine if there are more
            );

            // Check if there are more messages
            if (messages.length > actualLimit) {
                hasMore = true;
                messages = messages.slice(0, actualLimit);
            }
        } else {
            throw new Error('Either channelName or username must be provided');
        }

        // Send messages to client
        ws.send(
            JSON.stringify({
                type: 'historyResponse',
                messages: messages.map(
                    (msg: {
                        _id: string;
                        text: string;
                        username: string;
                        createdAt: Date;
                        status?: string;
                        fileName?: string;
                        fileType?: string;
                        fileUrl?: string;
                        fileSize?: number;
                        quotedMessage?: {
                            _id: string;
                            text: string;
                            username: string;
                        };
                    }) => ({
                        _id: msg._id,
                        text: msg.text,
                        username: msg.username,
                        createdAt: msg.createdAt,
                        status: msg.status || 'delivered',
                        ...(msg.fileName && msg.fileUrl && {
                            fileName: msg.fileName,
                            fileType: msg.fileType,
                            fileUrl: msg.fileUrl,
                            fileSize: msg.fileSize
                        }),
                        ...(msg.quotedMessage && {
                            quotedMessage: {
                                _id: msg.quotedMessage._id,
                                text: msg.quotedMessage.text,
                                username: msg.quotedMessage.username
                            }
                        })
                    })
                ),
                hasMore,
                before,
                // Include request ID if provided for correlation
                ...(requestId && { requestId })
            })
        );

        logger.debug('Sent message history', {
            username: user.username,
            teamName,
            channelName,
            directMessageUser: username,
            count: messages.length,
            hasMore,
            requestId
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error fetching message history', {
            teamName,
            channelName,
            username,
            requestId,
            error: errorMessage
        });

        ws.send(
            JSON.stringify({
                type: 'error',
                message: `Failed to fetch message history: ${errorMessage}`,
                ...(requestId && { requestId })
            })
        );
    }
};
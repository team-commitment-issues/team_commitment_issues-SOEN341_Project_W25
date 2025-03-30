import { WebSocketServer, WebSocket } from 'ws';
import { createLogger } from '../../utils/logger';
import { verifyToken } from '../middleware/authMiddleware';
import { ExtendedWebSocket, MessageAck } from '../../types/websocket';
import DMessage from '../../models/DMessage';
import DirectMessage from '../../models/DirectMessage';
import { Message } from '../../models/Message';
import ChannelService from '../../services/channelService';
import DirectMessageService from '../../services/directMessageService';

// Setup structured logging
const logger = createLogger('AckHandler');

/**
 * Handles message acknowledgments
 * @param ws WebSocket connection
 * @param message Message acknowledgment
 * @param wss WebSocket server
 * @param token JWT token
 */
export const handleMessageAck = async (
    ws: ExtendedWebSocket,
    message: MessageAck,
    wss: WebSocketServer,
    token: string
): Promise<void> => {
    const user = await verifyToken(token);
    ws.user = user;

    const { messageId, status, clientMessageId } = message;

    logger.debug('Message acknowledgment received', {
        username: user.username,
        messageId,
        status,
        clientMessageId
    });

    try {
        // Check if this is a direct message first
        const dMessage = await DMessage.findById(messageId);

        if (dMessage) {
            // This is a direct message, find the directMessage it belongs to
            const directMessage = await DirectMessage.findOne({
                dmessages: messageId
            })
                .populate('users')
                .exec();

            if (directMessage) {
                // Forward ack to all other participants
                const otherUsers = directMessage.users.filter(u => String(u) !== String(user._id));

                // Forward ack to all other participants
                otherUsers.forEach(otherUserId => {
                    wss.clients.forEach(client => {
                        const extClient = client as ExtendedWebSocket;
                        if (
                            extClient.readyState === WebSocket.OPEN &&
                            extClient.user &&
                            String(extClient.user._id) === String(otherUserId)
                        ) {
                            extClient.send(
                                JSON.stringify({
                                    type: 'messageAck',
                                    messageId,
                                    status,
                                    username: user.username,
                                    // Include clientMessageId if provided
                                    ...(clientMessageId && { clientMessageId })
                                })
                            );
                        }
                    });
                });

                // Update message status in database if needed
                if (status === 'read' || status === 'delivered') {
                    await DirectMessageService.updateMessageStatus(messageId, status);
                }
            }
        } else {
            // Check if this is a channel message
            const channelMessage = await Message.findById(messageId);

            if (channelMessage) {
                await ChannelService.updateMessageStatus(messageId, status);
            } else {
                throw new Error(`Message ${messageId} not found`);
            }
        }
    } catch (error) {
        logger.error('Error processing message acknowledgment', {
            messageId,
            status,
            clientMessageId,
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
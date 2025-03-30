import { WebSocketServer, WebSocket } from 'ws';
import { createLogger } from '../../utils/logger';
import { verifyToken } from '../middleware/authMiddleware';
import { ExtendedWebSocket, TypingMessage } from '../../types/websocket';

// Setup structured logging
const logger = createLogger('TypingHandler');

/**
 * Handles typing indicators
 * @param ws WebSocket connection
 * @param message Typing message
 * @param wss WebSocket server
 * @param token JWT token
 */
export const handleTyping = async (
    ws: ExtendedWebSocket,
    message: TypingMessage,
    wss: WebSocketServer,
    token: string
): Promise<void> => {
    const user = await verifyToken(token);

    if (message.channelName) {
        // Channel typing indicator
        let sentCount = 0;
        wss.clients.forEach(client => {
            const extendedClient = client as ExtendedWebSocket;
            if (
                extendedClient.readyState === WebSocket.OPEN &&
                extendedClient.channel &&
                extendedClient.channel.name === message.channelName &&
                extendedClient.team &&
                extendedClient.team.name === message.teamName
            ) {
                extendedClient.send(
                    JSON.stringify({
                        type: 'typing',
                        username: user.username,
                        isTyping: message.isTyping,
                        teamName: message.teamName,
                        channelName: message.channelName
                    })
                );
                sentCount++;
            }
        });

        logger.debug('Channel typing indicator sent', {
            username: user.username,
            teamName: message.teamName,
            channelName: message.channelName,
            isTyping: message.isTyping,
            sentCount
        });
    } else if (message.receiverUsername) {
        // Direct message typing indicator
        let sentCount = 0;
        wss.clients.forEach(client => {
            const extendedClient = client as ExtendedWebSocket;
            if (
                extendedClient.readyState === WebSocket.OPEN &&
                extendedClient.user &&
                (extendedClient.user.username === message.receiverUsername ||
                    extendedClient.user.username === user.username)
            ) {
                extendedClient.send(
                    JSON.stringify({
                        type: 'typing',
                        username: user.username,
                        isTyping: message.isTyping,
                        teamName: message.teamName,
                        receiverUsername: message.receiverUsername
                    })
                );
                sentCount++;
            }
        });

        logger.debug('DM typing indicator sent', {
            username: user.username,
            receiverUsername: message.receiverUsername,
            isTyping: message.isTyping,
            sentCount
        });
    }
};
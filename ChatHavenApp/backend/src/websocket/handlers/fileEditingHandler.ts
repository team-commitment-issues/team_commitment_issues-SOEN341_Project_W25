import { WebSocketServer, WebSocket } from 'ws';
import { createLogger } from '../../utils/logger';
import { verifyToken } from '../middleware/authMiddleware';
import {
    ExtendedWebSocket,
    FileEditLockRequest,
    FileEditLockRelease,
    FileUpdateRequest,
    MessageType
} from '../../types/websocket';
import fileEditingService from '../../services/fileEditingService';
import DMessage from '../../models/DMessage';
import DirectMessage from '../../models/DirectMessage';
import { Message } from '../../models/Message';
import Channel from '../../models/Channel';
import { ERROR_MESSAGES } from '../constants';

// Setup structured logging
const logger = createLogger('FileEditingHandler');

/**
 * Map to track recent releases to prevent duplicate broadcasts
 */
const recentReleases = new Map<string, number>();

/**
 * Handles requests for file edit locks
 * @param ws WebSocket connection
 * @param message File edit lock request
 * @param wss WebSocket server
 * @param token JWT token
 */
export const handleRequestEditLock = async (
    ws: ExtendedWebSocket,
    message: FileEditLockRequest,
    wss: WebSocketServer,
    token: string
): Promise<void> => {
    const user = await verifyToken(token);
    ws.user = user;

    const { messageId, fileName, teamName, channelName } = message;
    // Safely handle the direct message properties
    const isDirectMessage = message.directMessage === true;
    const receiverUsername = message.receiverUsername;

    logger.debug('Edit lock request received', {
        username: user.username,
        messageId,
        fileName,
        isDirectMessage,
        receiverUsername
    });

    try {
        // Request the lock from the file editing service
        const result = await fileEditingService.requestLock(
            messageId,
            fileName,
            user.username,
            teamName,
            channelName
        );

        // Send the response to the requester
        ws.send(
            JSON.stringify({
                type: MessageType.EDIT_LOCK_RESPONSE,
                messageId,
                granted: result.granted,
                lockedBy: result.lockedBy,
                lockedAt: result.lockedAt ? result.lockedAt.toISOString() : undefined
            })
        );

        // If lock was granted, broadcast the update to all relevant clients
        if (result.granted) {
            // Determine which clients should receive the update
            let relevantClients: ExtendedWebSocket[] = [];

            // Handle direct message case directly if context is provided
            if (isDirectMessage && receiverUsername) {
                logger.debug('Using direct message context for lock broadcast', {
                    messageId,
                    sender: user.username,
                    receiver: receiverUsername
                });

                wss.clients.forEach(client => {
                    const extClient = client as ExtendedWebSocket;
                    if (
                        extClient.readyState === WebSocket.OPEN &&
                        extClient.user &&
                        (extClient.user.username === user.username ||
                            extClient.user.username === receiverUsername)
                    ) {
                        relevantClients.push(extClient);
                    }
                });
            }
            else if (teamName && channelName) {
                // For channel messages
                wss.clients.forEach(client => {
                    const extClient = client as ExtendedWebSocket;
                    if (
                        extClient.readyState === WebSocket.OPEN &&
                        extClient.channel &&
                        extClient.channel.name === channelName &&
                        extClient.team &&
                        extClient.team.name === teamName
                    ) {
                        relevantClients.push(extClient);
                    }
                });
            } else {
                // Fallback to existing database lookup approach
                // [existing database lookup code]
            }

            // Broadcast the lock update with full information
            const lockUpdateMessage = JSON.stringify({
                type: MessageType.EDIT_LOCK_UPDATE,
                messageId,
                locked: true,
                username: user.username,
                acquiredAt: new Date().toISOString()
            });

            // Make sure to broadcast to all relevant clients
            relevantClients.forEach(client => {
                // Don't send to the requester who already got the response
                if (client !== ws) {
                    client.send(lockUpdateMessage);
                }
            });

            logger.debug('Edit lock granted and broadcasted', {
                username: user.username,
                messageId,
                fileName,
                recipients: relevantClients.length,
                sampleRecipients: relevantClients.slice(0, 3).map(c => c.user?.username)
            });
        } else {
            logger.debug('Edit lock denied', {
                username: user.username,
                messageId,
                fileName,
                lockedBy: result.lockedBy
            });
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error processing edit lock request', {
            username: user.username,
            messageId,
            fileName,
            error: errorMessage
        });

        ws.send(
            JSON.stringify({
                type: 'error',
                message: `Failed to acquire edit lock: ${errorMessage}`
            })
        );
    }
};

/**
 * Handles requests to release file edit locks
 * @param ws WebSocket connection
 * @param message File edit lock release
 * @param wss WebSocket server
 * @param token JWT token
 */
export const handleReleaseEditLock = async (
    ws: ExtendedWebSocket,
    message: FileEditLockRelease,
    wss: WebSocketServer,
    token: string
): Promise<void> => {
    const user = await verifyToken(token);
    ws.user = user;

    const { messageId, fileName, teamName, channelName } = message;

    logger.debug('Edit lock release request received', {
        username: user.username,
        messageId,
        fileName
    });

    const lockKey = `${messageId}-release`;
    const lastReleaseTime = recentReleases.get(lockKey);
    const now = Date.now();

    if (lastReleaseTime && now - lastReleaseTime < 500) {
        // We've already processed a release for this lock recently
        logger.debug('Skipping duplicate lock release broadcast', {
            messageId,
            username: user.username,
            timeSinceLastRelease: now - lastReleaseTime
        });
        return;
    }

    recentReleases.set(lockKey, now);
    // Clear old entries occasionally
    global.setTimeout(() => recentReleases.delete(lockKey), 1000);

    try {
        // Release the lock
        const released = fileEditingService.releaseLock(messageId, user.username);

        if (released) {
            // Determine which clients should receive the update
            let relevantClients: ExtendedWebSocket[] = [];

            if (teamName && channelName) {
                // For channel messages
                wss.clients.forEach(client => {
                    const extClient = client as ExtendedWebSocket;
                    if (
                        extClient.readyState === WebSocket.OPEN &&
                        extClient.channel &&
                        extClient.channel.name === channelName &&
                        extClient.team &&
                        extClient.team.name === teamName
                    ) {
                        relevantClients.push(extClient);
                    }
                });
            } else {
                // For direct messages - find the direct message to get participants
                const dMessage = await DMessage.findById(messageId);
                if (dMessage) {
                    const directMessage = await DirectMessage.findOne({
                        dmessages: messageId
                    })
                        .populate('users')
                        .exec();

                    if (directMessage) {
                        const participantIds = directMessage.users.map(u => String(u));
                        wss.clients.forEach(client => {
                            const extClient = client as ExtendedWebSocket;
                            if (
                                extClient.readyState === WebSocket.OPEN &&
                                extClient.user &&
                                participantIds.includes(String(extClient.user._id))
                            ) {
                                relevantClients.push(extClient);
                            }
                        });
                    }
                } else {
                    // If not a direct message, check if it's a channel message
                    const channelMessage = await Message.findById(messageId);
                    if (channelMessage) {
                        const channel = await Channel.findById(channelMessage.channel);
                        if (channel) {
                            wss.clients.forEach(client => {
                                const extClient = client as ExtendedWebSocket;
                                if (
                                    extClient.readyState === WebSocket.OPEN &&
                                    extClient.channel &&
                                    String(extClient.channel._id) === String(channel._id)
                                ) {
                                    relevantClients.push(extClient);
                                }
                            });
                        }
                    }
                }
            }

            // Broadcast the lock release
            relevantClients.forEach(client => {
                client.send(
                    JSON.stringify({
                        type: MessageType.EDIT_LOCK_UPDATE,
                        messageId,
                        locked: false
                    })
                );
            });

            logger.debug('Edit lock released and broadcasted', {
                username: user.username,
                messageId,
                fileName,
                recipients: relevantClients.length
            });
        } else {
            logger.warn('Failed to release edit lock', {
                username: user.username,
                messageId,
                fileName
            });
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error processing edit lock release', {
            username: user.username,
            messageId,
            fileName,
            error: errorMessage
        });

        ws.send(
            JSON.stringify({
                type: 'error',
                message: `Failed to release edit lock: ${errorMessage}`
            })
        );
    }
};

/**
 * Handles requests to update file content
 * @param ws WebSocket connection
 * @param message File update request
 * @param wss WebSocket server
 * @param token JWT token
 */
export const handleUpdateFileContent = async (
    ws: ExtendedWebSocket,
    message: FileUpdateRequest,
    wss: WebSocketServer,
    token: string
): Promise<void> => {
    const user = await verifyToken(token);
    ws.user = user;

    const { messageId, fileName, content, teamName, channelName, directMessage, receiverUsername } = message;

    logger.debug('File content update request received', {
        username: user.username,
        messageId,
        fileName,
        contentLength: content.length,
        isDirectMessage: !!directMessage,
        receiverUsername
    });

    try {
        // Verify that the user has the lock
        const lockStatus = fileEditingService.isLocked(messageId);

        if (lockStatus.locked && lockStatus.username === user.username) {
            // Update the file content
            const result = await fileEditingService.updateFileContent(messageId, user.username, content);

            if (result.success) {
                // Determine which clients should receive the update
                let relevantClients: ExtendedWebSocket[] = [];

                // Handle direct message case differently
                if (directMessage && receiverUsername) {
                    logger.debug('Processing file update for direct message', {
                        messageId,
                        senderUsername: user.username,
                        receiverUsername
                    });

                    // For direct messages - find clients by sender and receiver usernames directly
                    wss.clients.forEach(client => {
                        const extClient = client as ExtendedWebSocket;
                        if (
                            extClient.readyState === WebSocket.OPEN &&
                            extClient.user &&
                            (extClient.user.username === user.username ||
                                extClient.user.username === receiverUsername)
                        ) {
                            relevantClients.push(extClient);
                        }
                    });
                }
                else if (teamName && channelName) {
                    // For channel messages - existing logic
                    wss.clients.forEach(client => {
                        const extClient = client as ExtendedWebSocket;
                        if (
                            extClient.readyState === WebSocket.OPEN &&
                            extClient.channel &&
                            extClient.channel.name === channelName &&
                            extClient.team &&
                            extClient.team.name === teamName
                        ) {
                            relevantClients.push(extClient);
                        }
                    });
                }
                else {
                    // Fallback to database lookup approach
                    const dMessage = await DMessage.findById(messageId);
                    if (dMessage) {
                        const directMessage = await DirectMessage.findOne({
                            dmessages: messageId
                        })
                            .populate('users')
                            .exec();

                        if (directMessage) {
                            const participantIds = directMessage.users.map(u => String(u));
                            wss.clients.forEach(client => {
                                const extClient = client as ExtendedWebSocket;
                                if (
                                    extClient.readyState === WebSocket.OPEN &&
                                    extClient.user &&
                                    participantIds.includes(String(extClient.user._id))
                                ) {
                                    relevantClients.push(extClient);
                                }
                            });
                        }
                    } else {
                        // If not a direct message, check if it's a channel message
                        const channelMessage = await Message.findById(messageId);
                        if (channelMessage) {
                            const channel = await Channel.findById(channelMessage.channel);
                            if (channel) {
                                wss.clients.forEach(client => {
                                    const extClient = client as ExtendedWebSocket;
                                    if (
                                        extClient.readyState === WebSocket.OPEN &&
                                        extClient.channel &&
                                        String(extClient.channel._id) === String(channel._id)
                                    ) {
                                        relevantClients.push(extClient);
                                    }
                                });
                            }
                        }
                    }
                }

                // Broadcast the file update notification
                const now = new Date();
                const fileUpdatedMsg = {
                    type: MessageType.FILE_UPDATED,
                    messageId,
                    fileName: result.fileName,
                    editedBy: user.username,
                    editedAt: now.toISOString()
                };

                logger.debug('Broadcasting file update to clients', {
                    username: user.username,
                    messageId,
                    relevantClientCount: relevantClients.length,
                    sampleClients: relevantClients.slice(0, 2).map(c => c.user?.username)
                });

                relevantClients.forEach(client => {
                    client.send(JSON.stringify(fileUpdatedMsg));
                });

                // Also notify that the lock has been released
                relevantClients.forEach(client => {
                    client.send(
                        JSON.stringify({
                            type: MessageType.EDIT_LOCK_UPDATE,
                            messageId,
                            locked: false
                        })
                    );
                });

                logger.debug('File content updated and notifications sent', {
                    username: user.username,
                    messageId,
                    fileName: result.fileName,
                    recipients: relevantClients.length
                });
            } else {
                ws.send(
                    JSON.stringify({
                        type: 'error',
                        message: ERROR_MESSAGES.UPDATE_FAILED
                    })
                );
            }
        } else {
            const errorMsg = lockStatus.locked
                ? ERROR_MESSAGES.EDIT_LOCK_DENIED(lockStatus.username || 'Unknown user')
                : ERROR_MESSAGES.NO_EDIT_LOCK;

            logger.warn('Unauthorized file update attempt', {
                username: user.username,
                messageId,
                fileName,
                lockStatus
            });

            ws.send(
                JSON.stringify({
                    type: 'error',
                    message: errorMsg
                })
            );
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error updating file content', {
            username: user.username,
            messageId,
            fileName,
            error: errorMessage
        });

        ws.send(
            JSON.stringify({
                type: 'error',
                message: `Failed to update file content: ${errorMessage}`
            })
        );
    }
};

/**
 * Handle requests to retrieve file edit history
 */
export const handleGetFileEditHistory = async (
    ws: ExtendedWebSocket,
    message: { type: string, messageId: string },
    wss: WebSocketServer,
    token: string
): Promise<void> => {
    const user = await verifyToken(token);
    ws.user = user;

    const { messageId } = message;

    try {
        // First try to find a channel message
        const channelMessage = await Message.findById(messageId).select('fileName editHistory');
        if (channelMessage) {
            ws.send(JSON.stringify({
                type: 'fileEditHistory',
                messageId,
                history: channelMessage.editHistory || [{
                    username: channelMessage.editedBy,
                    timestamp: channelMessage.editedAt
                }],
                fileName: channelMessage.fileName
            }));
            return;
        }

        // If not found, check for direct message
        const directMessage = await DMessage.findById(messageId).select('fileName editHistory');
        if (directMessage) {
            ws.send(JSON.stringify({
                type: 'fileEditHistory',
                messageId,
                history: directMessage.editHistory || [{
                    username: directMessage.editedBy,
                    timestamp: directMessage.editedAt
                }],
                fileName: directMessage.fileName
            }));
            return;
        }

        // Message not found
        ws.send(JSON.stringify({
            type: 'error',
            message: `Message with ID ${messageId} not found`
        }));
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error retrieving file edit history', {
            username: user.username,
            messageId,
            error: errorMessage
        });

        ws.send(JSON.stringify({
            type: 'error',
            message: `Failed to retrieve file edit history: ${errorMessage}`
        }));
    }
};
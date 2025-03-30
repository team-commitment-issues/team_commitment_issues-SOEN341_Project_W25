import { WebSocketServer, WebSocket } from 'ws';
import { Schema, Types } from 'mongoose';
import { createLogger } from '../../utils/logger';
import DirectMessageService from '../../services/directMessageService';
import { verifyToken } from '../middleware/authMiddleware';
import User from '../../models/User';
import Team from '../../models/Team';
import TeamMember from '../../models/TeamMember';
import DirectMessage from '../../models/DirectMessage';
import { ExtendedWebSocket, DirectMessagePayload, MessageType, FileUploadCompletionResponse } from '../../types/websocket';
import fileStorageService from '../../services/fileStorageService';
import { ERROR_MESSAGES } from '../constants';
import { findOrCreateDirectMessage } from '../utils/messageUtils';

// Setup structured logging
const logger = createLogger('DirectMessageHandler');

/**
 * Handles direct message setup
 * @param ws WebSocket connection
 * @param message Direct message payload
 * @param token JWT token
 */
export const handleJoinDirectMessage = async (
    ws: ExtendedWebSocket,
    message: DirectMessagePayload,
    token: string
): Promise<void> => {
    const user = await verifyToken(token);
    ws.user = user;

    const { team, receiver, directMessage } = await findOrCreateDirectMessage(
        user._id as Schema.Types.ObjectId,
        message.teamName,
        message.username || ''
    );

    ws.team = team;
    ws.receiver = receiver;
    ws.directMessage = directMessage;

    ws.send(
        JSON.stringify({
            type: 'joinDirectMessage',
            teamName: team.name,
            username: message.username,
            directMessageId: directMessage._id
        })
    );

    logger.debug('Joined direct message', {
        userId: user._id,
        username: user.username,
        receiverUsername: receiver.username,
        directMessageId: directMessage._id
    });
};

/**
 * Handles direct messages
 * @param ws WebSocket connection
 * @param message Direct message payload
 * @param wss WebSocket server
 * @param token JWT token
 */
export const handleDirectMessage = async (
    ws: ExtendedWebSocket,
    message: DirectMessagePayload,
    wss: WebSocketServer,
    token: string
): Promise<void> => {
    const user = await verifyToken(token);
    ws.user = user;

    // Log incoming message details for debugging
    logger.debug('DirectMessage request details', {
        senderUsername: user.username,
        requestedReceiverUsername: message.username,
        receiverInPayload: message.receiverUsername,
        teamName: message.teamName,
        messageLength: message.text ? message.text.length : 0,
        hasFile: !!(message.fileData && message.fileName)
    });

    // Check if receiverUsername is used correctly in the payload
    const receiverUsername = message.receiverUsername || message.username;

    // Prevent messaging yourself
    if (user.username === receiverUsername) {
        logger.error('Self-messaging attempt detected', {
            username: user.username,
            receiverUsername,
            teamName: message.teamName
        });
        throw new Error(ERROR_MESSAGES.SELF_MESSAGING);
    }

    // Find the team, receiver, and direct message
    const { team, receiver, directMessage } = await findOrCreateDirectMessage(
        user._id as Schema.Types.ObjectId,
        message.teamName,
        receiverUsername || ''
    );

    // Update the WebSocket context
    ws.team = team;
    ws.receiver = receiver;
    ws.directMessage = directMessage;

    if (!message.text) {
        throw new Error(ERROR_MESSAGES.MESSAGE_TEXT_REQUIRED);
    }

    let fileUrl: string | undefined;
    let fileInfo: any = undefined;
    if (message.fileData && message.fileName && message.fileType) {
        try {
            logger.debug('Processing file attachment for DM', {
                fileName: message.fileName,
                fileType: message.fileType,
                fileSize: message.fileData ? message.fileData.length : 0
            });

            // Save the file using the file storage service
            const savedFileName = await fileStorageService.saveFile(
                message.fileData,
                message.fileName,
                message.fileType
            );

            fileUrl = `/files/${savedFileName}`;

            fileInfo = {
                fileName: message.fileName,
                fileType: message.fileType,
                fileUrl: fileUrl,
                fileSize: message.fileSize
            };

            logger.debug('DM file saved successfully', {
                fileName: message.fileName,
                savedAs: savedFileName,
                fileUrl: fileInfo.fileUrl
            });
        } catch (error: any) {
            logger.error('Failed to process DM file attachment', {
                fileName: message.fileName,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(ERROR_MESSAGES.FILE_PROCESSING_FAILED(error.message));
        }
    }

    const sentMessage = await DirectMessageService.sendDirectMessage(
        message.text,
        user.username,
        ws.directMessage?._id as Types.ObjectId,
        fileInfo,
        message.quotedMessage
    );

    if (message.fileData && message.fileName && fileUrl) {
        // This sends a direct notification to the sender
        wss.clients.forEach(client => {
            const extendedClient = client as ExtendedWebSocket;
            if (
                extendedClient.readyState === WebSocket.OPEN &&
                extendedClient.user &&
                extendedClient.user.username === user.username &&
                message.clientMessageId // Only send if we have a client message ID
            ) {
                const fileCompletionMsg: FileUploadCompletionResponse = {
                    type: MessageType.FILE_UPLOAD_COMPLETE,
                    messageId: (sentMessage._id as Types.ObjectId).toString(),
                    fileUrl: fileUrl,
                    status: 'sent',
                    clientMessageId: message.clientMessageId
                };

                extendedClient.send(JSON.stringify(fileCompletionMsg));

                logger.debug('Sent DM file upload completion notification', {
                    username: user.username,
                    messageId: sentMessage._id,
                    clientMessageId: message.clientMessageId,
                    fileUrl: fileUrl
                });
            }
        });
    }

    const formattedMessage = {
        type: 'directMessage',
        _id: sentMessage._id,
        text: sentMessage.text,
        username: sentMessage.username,
        createdAt: sentMessage.createdAt,
        status: sentMessage.status || 'sent',
        ...(sentMessage.fileName && sentMessage.fileUrl && {
            fileName: sentMessage.fileName,
            fileType: sentMessage.fileType,
            fileUrl: sentMessage.fileUrl,
            fileSize: sentMessage.fileSize
        }),
        ...(message.quotedMessage && {
            quotedMessage: {
                _id: message.quotedMessage._id,
                text: message.quotedMessage.text,
                username: message.quotedMessage.username
            }
        }),
        // Echo back the client message ID if provided
        ...(message.clientMessageId && { clientMessageId: message.clientMessageId })
    };

    // Send the message to both the sender and receiver
    let sentCount = 0;
    wss.clients.forEach(client => {
        const extendedClient = client as ExtendedWebSocket;
        if (
            extendedClient.readyState === WebSocket.OPEN &&
            extendedClient.user &&
            (extendedClient.user.username === user.username ||
                extendedClient.user.username === receiverUsername)
        ) {
            extendedClient.send(JSON.stringify(formattedMessage));
            sentCount++;
        }
    });

    logger.debug('Direct message sent', {
        directMessageId: ws.directMessage?._id ?? null,
        sender: user.username,
        receiver: receiverUsername,
        messageId: sentMessage._id,
        clientMessageId: message.clientMessageId,
        hasFile: !!fileUrl,
        sentCount
    });
};
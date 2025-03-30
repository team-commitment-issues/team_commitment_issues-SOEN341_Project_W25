import { WebSocketServer, WebSocket } from 'ws';
import { Schema, Types } from 'mongoose';
import { createLogger } from '../../utils/logger';
import ChannelService from '../../services/channelService';
import { authorizeUserForChannel } from '../middleware/authMiddleware';
import { ExtendedWebSocket, ChannelMessage, MessageType, FileUploadCompletionResponse } from '../../types/websocket';
import fileStorageService from '../../services/fileStorageService';
import { ERROR_MESSAGES } from '../constants';

// Setup structured logging
const logger = createLogger('ChannelHandler');

/**
 * Handles join channel requests
 * @param ws WebSocket connection
 * @param message Channel message
 * @param wss WebSocket server
 * @param token JWT token
 */
export const handleJoin = async (
    ws: ExtendedWebSocket,
    message: ChannelMessage,
    wss: WebSocketServer,
    token: string
): Promise<void> => {
    await authorizeUserForChannel(ws, message, token);
    ws.send(
        JSON.stringify({
            type: 'join',
            teamName: ws.team?.name,
            channelName: ws.channel?.name
        })
    );
};

/**
 * Handles sending messages to channels
 * @param ws WebSocket connection
 * @param message Channel message
 * @param wss WebSocket server
 * @param token JWT token
 */
export const handleMessage = async (
    ws: ExtendedWebSocket,
    message: ChannelMessage,
    wss: WebSocketServer,
    token: string
): Promise<void> => {
    await authorizeUserForChannel(ws, message, token);

    if (!ws.channel) {
        throw new Error(ERROR_MESSAGES.NO_CHANNEL_SELECTED);
    }

    if (!message.text) {
        throw new Error(ERROR_MESSAGES.MESSAGE_TEXT_REQUIRED);
    }

    let fileUrl: string | undefined;
    let fileInfo: any = undefined;

    if (message.fileData && message.fileName && message.fileType) {
        try {
            logger.debug('Processing file attachment', {
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

            // Store file information
            fileInfo = {
                fileName: message.fileName,
                fileType: message.fileType,
                fileUrl: fileUrl,
                fileSize: message.fileSize
            };

            logger.debug('File saved successfully', {
                fileName: message.fileName,
                savedAs: savedFileName,
                fileUrl: fileInfo.fileUrl
            });
        } catch (error: any) {
            logger.error('Failed to process file attachment', {
                fileName: message.fileName,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(ERROR_MESSAGES.FILE_PROCESSING_FAILED(
                error instanceof Error ? error.message : String(error)
            ));
        }
    }

    let sentMessage;
    if (ws.user?.role === 'SUPER_ADMIN') {
        sentMessage = await ChannelService.sendMessage(
            ws.channel._id as Types.ObjectId,
            ws.user.username as string,
            message.text,
            fileInfo,
            message.quotedMessage
        );
    } else {
        sentMessage = await ChannelService.sendMessage(
            ws.channel._id as Types.ObjectId,
            ws.teamMember?._id as Types.ObjectId,
            message.text,
            fileInfo,
            message.quotedMessage
        );
    }

    if (message.fileData && message.fileName && fileUrl) {
        // This sends a direct notification to the sender
        wss.clients.forEach(client => {
            const extendedClient = client as ExtendedWebSocket;
            if (
                extendedClient.readyState === WebSocket.OPEN &&
                extendedClient.user &&
                extendedClient.user.username === ws.user?.username &&
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

                logger.debug('Sent file upload completion notification', {
                    username: ws.user?.username,
                    messageId: sentMessage._id,
                    clientMessageId: message.clientMessageId,
                    fileUrl: fileUrl
                });
            }
        });
    }

    // Format and broadcast message to channel with file information
    const formattedMessage = {
        type: 'message',
        _id: sentMessage._id,
        text: sentMessage.text,
        username: sentMessage.username,
        createdAt: sentMessage.createdAt,
        // Include file information if available
        ...(sentMessage.fileName && sentMessage.fileUrl && {
            fileName: sentMessage.fileName,
            fileType: sentMessage.fileType,
            fileUrl: sentMessage.fileUrl,
            fileSize: sentMessage.fileSize
        }),
        // Include quoted message if available
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

    let sentCount = 0;
    wss.clients.forEach(client => {
        const extendedClient = client as ExtendedWebSocket;
        if (
            extendedClient.readyState === WebSocket.OPEN &&
            extendedClient.channel &&
            ws.channel &&
            extendedClient.channel._id === ws.channel._id &&
            extendedClient.team &&
            ws.team &&
            extendedClient.team._id === ws.team._id
        ) {
            extendedClient.send(JSON.stringify(formattedMessage));
            sentCount++;
        }
    });

    logger.debug('Channel message sent', {
        teamName: ws.team?.name,
        channelName: ws.channel.name,
        messageId: sentMessage._id,
        clientMessageId: message.clientMessageId,
        hasFile: !!fileUrl,
        sentCount,
        quotedMessage: message.quotedMessage
            ? {
                _id: message.quotedMessage._id,
                text: message.quotedMessage.text,
                username: message.quotedMessage.username
            }
            : undefined
    });
};
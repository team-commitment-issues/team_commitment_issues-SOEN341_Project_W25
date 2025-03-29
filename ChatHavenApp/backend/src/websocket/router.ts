import { WebSocketServer } from 'ws';
import { createLogger } from '../utils/logger';
import {
    ExtendedWebSocket, MessageType,
    BaseMessage,
    ChannelMessage,
    DirectMessagePayload,
    OnlineStatusSubscription,
    StatusMessage,
    TypingMessage,
    MessageAck,
    FetchHistoryMessage,
    FileEditLockRequest,
    FileEditLockRelease,
    FileUpdateRequest,

} from '../types/websocket';
import { ERROR_MESSAGES } from './constants';

// Import all handlers
import {
    handleJoin,
    handleMessage
} from './handlers/channelHandler';

import {
    handleJoinDirectMessage,
    handleDirectMessage
} from './handlers/directMessageHandler';

import {
    handlePing,
    handleSubscribeOnlineStatus,
    handleSetStatus
} from './handlers/statusHandler';

import { handleTyping } from './handlers/typingHandler';
import { handleMessageAck } from './handlers/ackHandler';
import { handleFetchHistory } from './handlers/historyHandler';

import {
    handleRequestEditLock,
    handleReleaseEditLock,
    handleUpdateFileContent
} from './handlers/fileEditingHandler';

// Setup structured logging
const logger = createLogger('WebSocketRouter');

/**
 * Main message handler dispatcher that routes messages to their specific handlers
 */
export const handleWebSocketMessage = async (
    ws: ExtendedWebSocket,
    message: BaseMessage,
    wss: WebSocketServer,
    token: string
): Promise<void> => {
    try {
        switch (message.type) {
            case MessageType.JOIN:
                await handleJoin(ws, message as ChannelMessage, wss, token);
                break;

            case MessageType.MESSAGE:
                await handleMessage(ws, message as ChannelMessage, wss, token);
                break;

            case MessageType.JOIN_DIRECT_MESSAGE:
                await handleJoinDirectMessage(ws, message as DirectMessagePayload, token);
                break;

            case MessageType.DIRECT_MESSAGE:
                await handleDirectMessage(ws, message as DirectMessagePayload, wss, token);
                break;

            case MessageType.PING:
                await handlePing(ws);
                break;

            case MessageType.SUBSCRIBE_ONLINE_STATUS:
                await handleSubscribeOnlineStatus(ws, message as OnlineStatusSubscription, token);
                break;

            case MessageType.SET_STATUS:
                await handleSetStatus(ws, message as StatusMessage, wss, token);
                break;

            case MessageType.TYPING:
                await handleTyping(ws, message as TypingMessage, wss, token);
                break;

            case MessageType.MESSAGE_ACK:
                await handleMessageAck(ws, message as MessageAck, wss, token);
                break;

            case MessageType.FETCH_HISTORY:
                await handleFetchHistory(ws, message as FetchHistoryMessage, token);
                break;

            case MessageType.REQUEST_EDIT_LOCK:
                await handleRequestEditLock(ws, message as FileEditLockRequest, wss, token);
                break;

            case MessageType.RELEASE_EDIT_LOCK:
                await handleReleaseEditLock(ws, message as FileEditLockRelease, wss, token);
                break;

            case MessageType.UPDATE_FILE_CONTENT:
                await handleUpdateFileContent(ws, message as FileUpdateRequest, wss, token);
                break;

            default:
                throw new Error(ERROR_MESSAGES.UNKNOWN_MESSAGE_TYPE(message.type));
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error(`Error handling message type ${message.type}`, { error: errorMessage });
        ws.send(JSON.stringify({ type: 'error', message: errorMessage }));
    }
};
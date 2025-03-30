// Types specific to the messaging component
import {
    ChatMessage,
    Selection,
    ContextMenuState,
    WebSocketMessage,
    RetryInfo,
    MessageStatus,
    QuotedMessage
} from '../../../types/shared.ts';

export interface FileInfo {
    fileName: string;
    fileType: string;
    fileUrl: string;
    fileSize?: number;
    uploadStatus: 'pending' | 'completed' | 'error';
}

export interface ConnectionStatus {
    status: 'connected' | 'connecting' | 'disconnected';
    lastConnected?: Date;
    reconnectAttempts?: number;
}

// Re-export shared types to avoid importing from two places
export {
    ChatMessage,
    Selection,
    ContextMenuState,
    WebSocketMessage,
    RetryInfo,
    MessageStatus,
    QuotedMessage
};
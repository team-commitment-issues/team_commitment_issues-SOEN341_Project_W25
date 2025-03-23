export type Selection = {
    type: 'channel';
    teamName: string;
    channelName: string;
} | {
    type: 'directMessage';
    teamName: string;
    username: string;
} | null;

export interface ContextMenuState {
    visible: boolean;
    x: number;
    y: number;
    selected: string;
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ChatMessage {
    _id: string;
    text: string;
    username: string;
    createdAt: Date;
    status?: MessageStatus;
    clientMessageId?: string;
}

export interface RetryInfo {
    message: WebSocketMessage;
    attempts: number;
    timeout: NodeJS.Timeout | null;
  }

export type Status = 'online' | 'away' | 'busy' | 'offline';

export interface UserStatus {
    username: string;
    status: Status;
    lastSeen?: Date;
}

export interface WebSocketMessage {
    type: string;
    teamName?: string;
    channelName?: string;
    username?: string;
    text?: string;
    isTyping?: boolean;
    receiverUsername?: string;
    status?: MessageStatus;
    _id?: string;
    createdAt?: string;
    clientMessageId?: string;
    messageId?: string;
    selection?: any;
    before?: string;
    limit?: number;
    hasMore?: boolean;
    messages?: any[];
    lastSeen?: string;
  }
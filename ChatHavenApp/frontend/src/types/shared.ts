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

export interface ChatMessage {
    _id: string;
    text: string;
    username: string;
    createdAt: Date;
}

export type StatusType = 'online' | 'away' | 'busy' | 'offline';

export interface UserStatus {
    username: string;
    status: StatusType;
    lastSeen?: Date;
}

export type WebSocketMessage = 
    | { type: 'message'; text: string; username: string; _id: string; createdAt: string; teamName: string; channelName: string }
    | { type: 'directMessage'; text: string; username: string; receiverUsername: string; _id: string; createdAt: string; teamName: string }
    | { type: 'statusUpdate'; username: string; status: StatusType; lastSeen?: string }
    | { type: 'typing'; username: string; isTyping: boolean; teamName: string; channelName?: string; receiverUsername?: string }
    | { type: 'join'; teamName: string; channelName: string }
    | { type: 'joinDirectMessage'; teamName: string; username: string }
    | { type: 'ping'; selection: Selection }
    | { type: 'subscribeOnlineStatus'; teamName: string };
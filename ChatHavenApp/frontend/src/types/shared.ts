// Enum for user online status
export enum Status {
  ONLINE = 'online',
  AWAY = 'away',
  BUSY = 'busy',
  OFFLINE = 'offline'
}

// Enum for user roles
export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

// Message delivery status types
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

// User status object for tracking online status
export interface UserStatus {
  username: string;
  status: Status;
  lastSeen?: Date;
}

// Base WebSocket message interface
export interface WebSocketMessage {
  type: string;
  clientMessageId?: string;
  [key: string]: any; // Allow additional properties
}

// Chat message for display in UI
export interface ChatMessage {
  _id: string;
  text: string;
  username: string;
  createdAt: Date;
  status?: MessageStatus;
  clientMessageId?: string;
}

// Selection for channel or direct message in UI
export interface Selection {
  type: 'channel' | 'directMessage';
  teamName: string;
  channelName?: string;
  username?: string; // For direct messages - the receiver's username
}

// Context menu state for right-click actions
export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  selected: string;
}

// RetryInfo interface for WebSocketClient
export interface RetryInfo {
  message: WebSocketMessage;
  attempts: number;
  timeout: NodeJS.Timeout | null;
  clientMessageId?: string;
  createdAt: number;
}

// Message payload interfaces
// --------------------------

// Channel message payload
export interface ChannelMessagePayload extends WebSocketMessage {
  type: 'message';
  text: string;
  teamName: string;
  channelName: string;
  username?: string; // Sender username
}

// Direct message payload
export interface DirectMessagePayload extends WebSocketMessage {
  type: 'directMessage';
  text: string;
  teamName: string;
  receiverUsername: string; // The receiver's username
  username?: string; // Sender username (optional, used for clarity)
}

// Join channel payload
export interface JoinChannelPayload extends WebSocketMessage {
  type: 'join';
  teamName: string;
  channelName: string;
}

// Join direct message payload
export interface JoinDirectMessagePayload extends WebSocketMessage {
  type: 'joinDirectMessage';
  teamName: string;
  username: string; // The receiver's username (server API expects this field)
}

// Typing indicator payload
export interface TypingPayload extends WebSocketMessage {
  type: 'typing';
  isTyping: boolean;
  teamName: string;
  username?: string; // Who is typing
  receiverUsername?: string; // For DMs
  channelName?: string; // For channels
}

// Status update payload
export interface StatusUpdatePayload extends WebSocketMessage {
  type: 'setStatus';
  status: Status; // Using the Status enum, not MessageStatus
}

// Online status subscription payload
export interface OnlineStatusSubscriptionPayload extends WebSocketMessage {
  type: 'subscribeOnlineStatus';
  teamName: string;
  channelName?: string; // Optional, for channel-specific subscriptions
}

// Message acknowledgment payload
export interface MessageAckPayload extends WebSocketMessage {
  type: 'messageAck';
  messageId: string;
  status: MessageStatus;
}

// Fetch history request payload
export interface FetchHistoryPayload extends WebSocketMessage {
  type: 'fetchHistory';
  teamName: string;
  channelName?: string;
  username?: string; // For direct messages - other user's username
  before?: string; // Message ID to fetch before (for pagination)
  limit?: number;
  requestId?: string;
}

// Helper functions for creating message payloads
// ---------------------------------------------

// Create channel message payload
export const createChannelMessagePayload = (
  text: string,
  username: string,
  teamName: string,
  channelName: string
): ChannelMessagePayload => {
  return {
    type: 'message',
    text,
    username,
    teamName,
    channelName
  };
};

// Create direct message payload
export const createDirectMessagePayload = (
  text: string,
  senderUsername: string,
  teamName: string,
  receiverUsername: string
): DirectMessagePayload => {
  return {
    type: 'directMessage',
    text,
    username: senderUsername, // Optional but helps with clarity
    teamName,
    receiverUsername
  };
};

// Create join channel request
export const createJoinChannelRequest = (
  teamName: string,
  channelName: string
): JoinChannelPayload => {
  return {
    type: 'join',
    teamName,
    channelName
  };
};

// Create join direct message request
export const createJoinDirectMessageRequest = (
  teamName: string,
  receiverUsername: string
): JoinDirectMessagePayload => {
  return {
    type: 'joinDirectMessage',
    teamName,
    username: receiverUsername // Server expects username field for the receiver
  };
};

// Create typing indicator for channels
export const createChannelTypingIndicator = (
  isTyping: boolean,
  username: string,
  teamName: string,
  channelName: string
): TypingPayload => {
  return {
    type: 'typing',
    isTyping,
    username,
    teamName,
    channelName
  };
};

// Create typing indicator for direct messages
export const createDirectMessageTypingIndicator = (
  isTyping: boolean,
  username: string,
  teamName: string,
  receiverUsername: string
): TypingPayload => {
  return {
    type: 'typing',
    isTyping,
    username,
    teamName,
    receiverUsername
  };
};

// Create status update payload
export const createStatusUpdatePayload = (
  status: Status
): StatusUpdatePayload => {
  return {
    type: 'setStatus',
    status
  };
};

// Create online status subscription request
export const createOnlineStatusSubscriptionRequest = (
  teamName: string,
  channelName?: string
): OnlineStatusSubscriptionPayload => {
  return {
    type: 'subscribeOnlineStatus',
    teamName,
    ...(channelName && { channelName })
  };
};

// Create message acknowledgment
export const createMessageAck = (
  messageId: string,
  status: MessageStatus
): MessageAckPayload => {
  return {
    type: 'messageAck',
    messageId,
    status
  };
};

// Create fetch history request for channels
export const createChannelHistoryRequest = (
  teamName: string,
  channelName: string,
  before?: string,
  limit: number = 50
): FetchHistoryPayload => {
  return {
    type: 'fetchHistory',
    teamName,
    channelName,
    before,
    limit,
    requestId: `history_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  };
};

// Create fetch history request for direct messages
export const createDirectMessageHistoryRequest = (
  teamName: string,
  receiverUsername: string,
  before?: string,
  limit: number = 50
): FetchHistoryPayload => {
  return {
    type: 'fetchHistory',
    teamName,
    username: receiverUsername, // Server API expects username field for the receiver
    before,
    limit,
    requestId: `history_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  };
};
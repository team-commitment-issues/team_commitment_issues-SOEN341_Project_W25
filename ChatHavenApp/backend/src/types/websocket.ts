import { WebSocket } from 'ws';
import { IUser } from '../models/User';
import { ITeam } from '../models/Team';
import { ITeamMember } from '../models/TeamMember';
import { IChannel } from '../models/Channel';
import { IDirectMessage } from '../models/DirectMessage';
import { Status } from '../enums';

/**
 * Extended WebSocket interface with additional properties for the application
 */
export interface ExtendedWebSocket extends WebSocket {
  team?: ITeam;
  channel?: IChannel;
  user?: IUser;
  teamMember?: ITeamMember;
  receiver?: IUser;
  directMessage?: IDirectMessage;
  subscribedTeams?: Set<string>;
  sessionId?: string;
  lastActivity?: Date;
  isAlive?: boolean; // For health checking
}

/**
 * All supported message types
 */
export enum MessageType {
  JOIN = 'join',
  MESSAGE = 'message',
  DIRECT_MESSAGE = 'directMessage',
  JOIN_DIRECT_MESSAGE = 'joinDirectMessage',
  PING = 'ping',
  PONG = 'pong',
  SUBSCRIBE_ONLINE_STATUS = 'subscribeOnlineStatus',
  SET_STATUS = 'setStatus',
  TYPING = 'typing',
  MESSAGE_ACK = 'messageAck',
  FETCH_HISTORY = 'fetchHistory',
  HISTORY_RESPONSE = 'historyResponse',
  FILE_UPLOAD_COMPLETE = 'fileUploadComplete',
  REQUEST_EDIT_LOCK = 'requestEditLock',
  RELEASE_EDIT_LOCK = 'releaseEditLock',
  EDIT_LOCK_RESPONSE = 'editLockResponse',
  EDIT_LOCK_UPDATE = 'editLockUpdate',
  UPDATE_FILE_CONTENT = 'updateFileContent',
  FILE_UPDATED = 'fileUpdated',
  FILE_EDIT_HISTORY = 'fileEditHistory',
  GET_FILE_EDIT_HISTORY = 'getFileEditHistory',
}

/**
 * Base message interface all messages extend from
 */
export interface BaseMessage {
  type: MessageType;
  clientMessageId?: string; // For tracking messages on client side
}

/**
 * Channel-related message
 */
export interface ChannelMessage extends BaseMessage {
  teamName: string;
  channelName: string;
  text?: string;
  username?: string; // Sender username
  _id?: string; // Server-assigned message ID
  createdAt?: string; // ISO string date
  status?: MessageStatus; // Message delivery status
  fileName?: string;
  fileType?: string;
  fileData?: string;
  fileSize?: number;
  quotedMessage?: {
    _id: string;
    text: string;
    username: string;
  };
}

/**
 * Direct message between users
 */
export interface DirectMessagePayload extends BaseMessage {
  teamName: string;
  username?: string; // Sender username
  receiverUsername: string;
  text?: string;
  _id?: string; // Server-assigned message ID
  createdAt?: string; // ISO string date
  status?: MessageStatus; // Message delivery status
  fileName?: string;
  fileType?: string;
  fileData?: string;
  fileSize?: number;
  quotedMessage?: {
    _id: string;
    text: string;
    username: string;
  };
}

/**
 * Join direct message request
 */
export interface JoinDirectMessagePayload extends BaseMessage {
  teamName: string;
  username: string; // Receiver username to start a conversation with
}

/**
 * Status update message
 */
export interface StatusMessage extends BaseMessage {
  status: Status;
}

/**
 * Typing indicator message
 */
export interface TypingMessage extends BaseMessage {
  teamName: string;
  channelName?: string;
  receiverUsername?: string;
  isTyping: boolean;
  username?: string; // Who is typing
}

/**
 * Online status subscription message
 */
export interface OnlineStatusSubscription extends BaseMessage {
  teamName: string;
}

/**
 * Message acknowledgment interface
 */
export interface MessageAck extends BaseMessage {
  messageId: string;
  status: MessageStatus;
  error?: string;
  username?: string; // Username of the acknowledging user
}

/**
 * Message status types
 */
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

/**
 * Fetch message history request
 */
export interface FetchHistoryMessage extends BaseMessage {
  teamName: string;
  channelName?: string;
  username?: string; // For direct messages - this is the other user's username
  before?: string; // Message ID to fetch before
  limit: number;
  requestId?: string;
}

/**
 * History response message
 */
export interface HistoryResponse extends BaseMessage {
  messages: Array<{
    _id: string;
    text: string;
    username: string;
    createdAt: string; // ISO string date
    status?: MessageStatus;
  }>;
  hasMore: boolean;
  before?: string; // The original 'before' parameter
  requestId?: string; // Echo back the request ID
}

export interface FileUploadCompletionResponse extends BaseMessage {
  messageId: string;
  fileUrl: string; // URL of the uploaded file
  status: MessageStatus; // Status of the file upload
  error?: string; // Error message if any
}

/**
 * Request to acquire an edit lock on a file
 */
export interface FileEditLockRequest extends BaseMessage {
  type: MessageType.REQUEST_EDIT_LOCK;
  messageId: string;
  fileName: string;
  teamName?: string;
  channelName?: string;
  directMessage?: boolean;
  receiverUsername?: string;
}

/**
 * Request to release an edit lock
 */
export interface FileEditLockRelease extends BaseMessage {
  type: MessageType.RELEASE_EDIT_LOCK;
  messageId: string;
  fileName: string;
  teamName?: string;
  channelName?: string;
  directMessage?: boolean;
  receiverUsername?: string;
}

/**
 * Response to an edit lock request
 */
export interface FileEditLockResponse extends BaseMessage {
  type: MessageType.EDIT_LOCK_RESPONSE;
  messageId: string;
  granted: boolean;
  lockedBy?: string;
  lockedAt?: string;
}

/**
 * Notification about lock status changes
 */
export interface FileEditLockUpdate extends BaseMessage {
  type: MessageType.EDIT_LOCK_UPDATE;
  messageId: string;
  locked: boolean;
  username?: string;
  acquiredAt?: string;
}

/**
 * Request to update file content
 */
export interface FileUpdateRequest extends BaseMessage {
  type: MessageType.UPDATE_FILE_CONTENT;
  messageId: string;
  fileName: string;
  content: string;
  teamName?: string;
  channelName?: string;
  directMessage?: boolean;
  receiverUsername?: string;
}

/**
 * Notification that a file has been updated
 */
export interface FileUpdatedNotification extends BaseMessage {
  type: MessageType.FILE_UPDATED;
  messageId: string;
  fileName: string;
  editedBy: string;
  editedAt: string;
}

export interface FileEditHistoryRequest extends BaseMessage {
  type: MessageType.GET_FILE_EDIT_HISTORY;
  messageId: string;
}

/**
 * Union type of all possible message types
 */
export type Message =
  | ChannelMessage
  | DirectMessagePayload
  | JoinDirectMessagePayload
  | StatusMessage
  | TypingMessage
  | OnlineStatusSubscription
  | MessageAck
  | FetchHistoryMessage
  | HistoryResponse
  | FileUploadCompletionResponse
  | FileEditLockRequest
  | FileEditLockRelease
  | FileEditLockResponse
  | FileEditLockUpdate
  | FileUpdateRequest
  | FileUpdatedNotification
  | FileEditHistoryRequest
  | BaseMessage;

/**
 * Decoded JWT token structure
 */
export interface DecodedToken {
  username: string;
  email: string;
  iat?: number;
  exp?: number;
}

// types/websocket.ts
import { WebSocket } from 'ws';
import { Schema } from 'mongoose';
import { IUser } from '../models/User';
import { ITeam } from '../models/Team';
import { ITeamMember } from '../models/TeamMember';
import { IChannel } from '../models/Channel';
import { IDirectMessage } from '../models/DirectMessage';
import { Role, Status } from '../enums';

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
}

/**
 * Base message interface all messages extend from
 */
export interface BaseMessage {
  type: MessageType;
}

/**
 * Channel-related message
 */
export interface ChannelMessage extends BaseMessage {
  teamName: string;
  channelName: string;
  text?: string;
}

/**
 * Direct message between users
 */
export interface DirectMessagePayload extends BaseMessage {
  teamName: string;
  username: string; // receiver username
  text?: string;
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
}

/**
 * Online status subscription message
 */
export interface OnlineStatusSubscription extends BaseMessage {
  teamName: string;
}

/**
 * Union type of all possible message types
 */
export type Message = 
  | ChannelMessage 
  | DirectMessagePayload 
  | StatusMessage 
  | TypingMessage 
  | OnlineStatusSubscription;

/**
 * All supported message types
 */
export enum MessageType {
  JOIN = 'join',
  MESSAGE = 'message',
  DIRECT_MESSAGE = 'directMessage',
  JOIN_DIRECT_MESSAGE = 'joinDirectMessage',
  PING = 'ping',
  SUBSCRIBE_ONLINE_STATUS = 'subscribeOnlineStatus',
  SET_STATUS = 'setStatus',
  TYPING = 'typing'
}

/**
 * Decoded JWT token structure
 */
export interface DecodedToken {
  username: string;
  email: string;
  iat?: number;
  exp?: number;
}

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
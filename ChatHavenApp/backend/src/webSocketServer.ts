import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { Schema, Types } from 'mongoose';
import ChannelService from './services/channelService';
import DirectMessageService from './services/directMessageService';
import OnlineStatusService from './services/onlineStatusService';
import ConnectionManager from './services/connectionManager';
import User, { IUser } from './models/User';
import Team, { ITeam } from './models/Team';
import TeamMember, { ITeamMember } from './models/TeamMember';
import Channel, { IChannel } from './models/Channel';
import DirectMessage, { IDirectMessage } from './models/DirectMessage';
import { Message } from './models/Message';
import { Role, Status } from './enums';
import { setTimeout } from 'timers/promises';
import { createLogger } from './utils/logger';
import { defaultRateLimiter } from './utils/rateLimiter';
import WebSocketMetrics from './utils/metrics';
import ClientHealthChecker from './services/clientHealthChecker';
import fileStorageService from './services/fileStorageService';
import {
  ExtendedWebSocket,
  DecodedToken,
  MessageType,
  ChannelMessage,
  DirectMessagePayload,
  StatusMessage,
  TypingMessage,
  OnlineStatusSubscription,
  MessageAck,
  FetchHistoryMessage,
  BaseMessage
} from './types/websocket';
import DMessage from './models/DMessage';

// Setup structured logging
const logger = createLogger('WebSocketServer');

// Configuration
const CONFIG = {
  DEBUG: process.env.NODE_ENV !== 'production',
  RECONNECT_TIMEOUT_MS: 5000,
  STALE_USER_CLEANUP_INTERVAL_MS: 24 * 60 * 60 * 1000, // 24 hours
  JWT_SECRET: process.env.JWT_SECRET || '',
  // Max number of concurrent connections per user
  MAX_CONCURRENT_CONNECTIONS_PER_USER: 5
};

/**
 * Handles user disconnection by waiting for potential reconnection
 * before broadcasting offline status
 */
const handleDisconnection = async (
  userId: Schema.Types.ObjectId,
  username: string,
  wss: WebSocketServer
) => {
  try {
    // Wait for reconnection timeout
    await setTimeout(CONFIG.RECONNECT_TIMEOUT_MS);

    // Re-check the user's status
    const user = await User.findById(userId);
    if (user && user.status === Status.OFFLINE) {
      // Broadcast the offline status
      await broadcastStatusUpdate(wss, username, Status.OFFLINE, new Date());
    }
  } catch (error) {
    logger.error('Error in disconnection handler', { userId, error });
  }
};

/**
 * Verifies JWT token and retrieves the associated user
 */
const verifyToken = async (token: string): Promise<IUser> => {
  try {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret || jwtSecret.trim() === '') {
      logger.error('JWT_SECRET not configured or empty');
      throw new Error('Server configuration error: JWT_SECRET not properly configured');
    }

    // Log token format (but not the actual token) for debugging
    logger.debug('Verifying token', {
      tokenLength: token.length,
      tokenFormat: token.includes('.') ? 'JWT format' : 'Invalid format'
    });

    const decoded = jwt.verify(token, jwtSecret) as DecodedToken;

    if (!decoded || !decoded.username) {
      logger.error('Token decoded but missing username', { decoded });
      throw new Error('Invalid token structure');
    }

    const user = await User.findOne({ username: decoded.username }).exec();

    if (!user) {
      logger.error('User from token not found in database', { username: decoded.username });
      throw new Error('User not found');
    }

    return user;
  } catch (err) {
    // Enhance error logging
    if (err instanceof Error) {
      logger.error('Token verification failed', {
        errorName: err.name,
        errorMessage: err.message,
        // Only log error stack in development
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });

      // Standardize error for jwt specific errors
      if (err.name === 'JsonWebTokenError') {
        const error = new Error('Invalid token');
        error.message = 'InvalidTokenError';
        throw error;
      } else if (err.name === 'TokenExpiredError') {
        const error = new Error('Token expired');
        error.message = 'TokenExpiredError';
        throw error;
      }
    }

    // Generic error for any other issues
    const error = new Error('Authentication failed');
    error.message = 'InvalidTokenError';
    throw error;
  }
};

/**
 * Finds team and channel for a given request
 */
const findTeamAndChannel = async (
  teamName: string,
  channelName: string,
  userId: Schema.Types.ObjectId,
  userRole: Role
): Promise<{ team: ITeam; teamMember?: ITeamMember; channel: IChannel }> => {
  const team = await Team.findOne({ name: teamName }).exec();
  if (!team) throw new Error(`Team "${teamName}" not found`);

  let teamMember;
  if (userRole !== Role.SUPER_ADMIN) {
    teamMember = await TeamMember.findOne({ user: userId, team: team._id }).exec();
    if (!teamMember) throw new Error(`User not a member of team "${teamName}"`);
  }

  const channel = await Channel.findOne({ name: channelName, team: team._id }).exec();
  if (!channel) throw new Error(`Channel "${channelName}" not found in team "${teamName}"`);

  return { team, teamMember, channel };
};

/**
 * Authorizes a user for channel access
 */
const authorizeUserForChannel = async (
  ws: ExtendedWebSocket,
  message: ChannelMessage,
  token: string
): Promise<void> => {
  // Verify the user
  const user = await verifyToken(token);
  ws.user = user;

  // Find team and channel
  const { team, teamMember, channel } = await findTeamAndChannel(
    message.teamName,
    message.channelName,
    user._id as Schema.Types.ObjectId,
    user.role
  );

  ws.team = team;
  if (user.role !== Role.SUPER_ADMIN && teamMember) {
    ws.teamMember = teamMember;
  }
  ws.channel = channel;

  // Check if user is authorized for this channel
  const isMember = ws.channel.members.some(
    member => member.toString() === ws.teamMember?._id?.toString()
  );
  const hasPermission = user.role === 'SUPER_ADMIN' || teamMember?.role === 'ADMIN';

  if (!isMember && !hasPermission) {
    logger.warn('Unauthorized channel access attempt', {
      userId: user._id,
      username: user.username,
      userRole: user.role,
      teamMemberRole: teamMember?.role,
      channelId: channel._id,
      channelName: channel.name,
      teamId: team._id,
      teamName: team.name
    });

    ws.close(3000, 'Unauthorized');
    throw new Error('Unauthorized channel access');
  }
};

/**
 * Finds or creates a direct message between two users
 */
const findOrCreateDirectMessage = async (
  userId: Schema.Types.ObjectId,
  teamName: string,
  username: string
): Promise<{ team: ITeam; receiver: IUser; directMessage: IDirectMessage }> => {
  const team = await Team.findOne({ name: teamName }).exec();
  if (!team) throw new Error(`Team with name "${teamName}" not found`);

  const user1 = await User.findById(userId).exec();
  if (!user1) throw new Error(`User with ID "${userId}" not found`);

  if (user1.role !== 'SUPER_ADMIN') {
    const teamMember = await TeamMember.findOne({ user: userId, team: team._id }).exec();
    if (!teamMember) throw new Error(`User is not a member of team "${teamName}"`);
  }

  const user2 = await User.findOne({ username }).exec();
  if (!user2) throw new Error(`User with username "${username}" not found`);

  // Handle self-messaging case specially to avoid confusion
  if (user1.username === user2.username) {
    throw new Error('Cannot create a direct message with yourself');
  }

  // Verify receiver is a team member
  if (user2.role !== 'SUPER_ADMIN') {
    const teamMember = await TeamMember.findOne({ user: user2._id, team: team._id }).exec();
    if (!teamMember) throw new Error(`User "${username}" is not a member of team "${teamName}"`);
  }

  // Try to find an existing direct message between these specific users
  // IMPORTANT: Find direction message that contains BOTH users, and ONLY these two users
  let directMessage = await DirectMessage.findOne({
    users: { $all: [user1._id, user2._id], $size: 2 }
  }).exec();

  // Create a new direct message if needed
  if (!directMessage) {
    logger.info('Creating new direct message', {
      sender: user1.username,
      receiver: user2.username,
      teamName: team.name
    });

    directMessage = await DirectMessageService.createDirectMessage(
      user2.username,
      user1._id as Schema.Types.ObjectId,
      team._id as Schema.Types.ObjectId
    );
  }

  return { team, receiver: user2, directMessage };
};

/**
 * Broadcasts status updates to all subscribed clients
 */
const broadcastStatusUpdate = async (
  wss: WebSocketServer,
  username: string,
  status: Status,
  lastSeen: Date
): Promise<void> => {
  try {
    const user = await User.findOne({ username }).exec();
    if (!user) return;

    // Get all teams this user belongs to
    const teamIds = await OnlineStatusService.getUserTeams(user._id as Schema.Types.ObjectId);

    // Collect all subscribers
    const subscribers = new Set<string>();
    for (const teamId of teamIds) {
      const teamSubscribers = await OnlineStatusService.getTeamSubscribers(teamId);
      teamSubscribers.forEach(sub => subscribers.add(sub));
    }

    // Format the status update
    const statusUpdate = {
      type: 'statusUpdate',
      username,
      status,
      lastSeen: lastSeen.toISOString()
    };

    // Send to all subscribed clients
    let sentCount = 0;
    wss.clients.forEach(client => {
      const extendedClient = client as ExtendedWebSocket;

      if (
        extendedClient.readyState === WebSocket.OPEN &&
        extendedClient.user &&
        subscribers.has(extendedClient.user.username)
      ) {
        extendedClient.send(JSON.stringify(statusUpdate));
        sentCount++;
      }
    });

    logger.debug('Broadcast status update', { username, status, sentCount });
  } catch (error) {
    logger.error('Error broadcasting status update', { username, status, error });
  }
};

/**
 * Handler for different message types
 */
class MessageHandlers {
  /**
   * Handles join channel requests
   */
  static async handleJoin(
    ws: ExtendedWebSocket,
    message: ChannelMessage,
    wss: WebSocketServer,
    token: string
  ): Promise<void> {
    await authorizeUserForChannel(ws, message, token);
    ws.send(
      JSON.stringify({
        type: 'join',
        teamName: ws.team?.name,
        channelName: ws.channel?.name
      })
    );
  }

  /**
   * Handles sending messages to channels
   */
  static async handleMessage(
    ws: ExtendedWebSocket,
    message: ChannelMessage,
    wss: WebSocketServer,
    token: string
  ): Promise<void> {
    await authorizeUserForChannel(ws, message, token);

    if (!ws.channel) {
      throw new Error('No channel selected');
    }

    if (!message.text) {
      throw new Error('Message text is required');
    }

    let fileUrl: string | undefined;
    let fileInfo: any = undefined;

    if (message.fileData && message.fileName && message.fileType) {
      try {
        logger.debug('Processing file attachment', {
          fileName: message.fileName,
          fileType: message.fileType,
          fileSize: message.fileData.length
        });

        // Save the file using the file storage service
        fileUrl = await fileStorageService.saveFile(
          message.fileData,
          message.fileName,
          message.fileType
        );

        // Store file information
        fileInfo = {
          fileName: message.fileName,
          fileType: message.fileType,
          fileUrl: `/files/${fileUrl}`, // Use the relative path
          fileSize: message.fileSize
        };

        logger.debug('File saved successfully', { fileName: message.fileName, fileUrl });
      } catch (error: any) {
        logger.error('Failed to process file attachment', {
          fileName: message.fileName,
          error: error instanceof Error ? error.message : String(error)
        });
        throw new Error(`Failed to process file attachment: ${error instanceof Error ? error.message : String(error)}`);
      }
    }


    let sentMessage;
    if (ws.user?.role === 'SUPER_ADMIN') {
      sentMessage = await ChannelService.sendMessage(
        ws.channel._id as Types.ObjectId,
        ws.user.username as string,
        message.text,
        fileInfo // Pass file information
      );
    } else {
      sentMessage = await ChannelService.sendMessage(
        ws.channel._id as Types.ObjectId,
        ws.teamMember?._id as Types.ObjectId,
        message.text,
        fileInfo // Pass file information
      );
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
      sentCount
    });
  }

  /**
   * Handles direct message setup
   */
  static async handleJoinDirectMessage(
    ws: ExtendedWebSocket,
    message: DirectMessagePayload,
    token: string
  ): Promise<void> {
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
  }

  /**
   * Handles direct messages
   */
  static async handleDirectMessage(
    ws: ExtendedWebSocket,
    message: DirectMessagePayload,
    wss: WebSocketServer,
    token: string
  ): Promise<void> {
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

    // Prevent messaging yourself (with more detailed logging)
    if (user.username === receiverUsername) {
      logger.error('Self-messaging attempt detected', {
        username: user.username,
        receiverUsername,
        teamName: message.teamName
      });
      throw new Error('Cannot send a direct message to yourself');
    }

    // Find receiver user first for validation
    const receiver = await User.findOne({ username: receiverUsername });
    if (!receiver) {
      throw new Error(`User with username "${receiverUsername}" not found`);
    }

    // Find the team
    const team = await Team.findOne({ name: message.teamName }).exec();
    if (!team) throw new Error(`Team with name "${message.teamName}" not found`);

    // Try to find the direct message between these two specific users
    const directMessage = await DirectMessage.findOne({
      users: {
        $all: [user._id, receiver._id],
        $size: 2
      }
    }).exec();

    if (!directMessage) {
      logger.info('Creating new direct message', {
        sender: user.username,
        receiver: receiverUsername,
        teamName: message.teamName
      });

      // Create the direct message if it doesn't exist
      const newDirectMessage = await DirectMessageService.createDirectMessage(
        receiverUsername!,
        user._id as Schema.Types.ObjectId,
        team._id as Schema.Types.ObjectId
      );

      // Update the WebSocket context
      ws.team = team;
      ws.receiver = receiver;
      ws.directMessage = newDirectMessage;
    } else {
      // Update the WebSocket context with the existing direct message
      ws.team = team;
      ws.receiver = receiver;
      ws.directMessage = directMessage;
    }

    logger.debug('Using direct message context', {
      userId: user._id,
      username: user.username,
      receiverUsername,
      directMessageId: ws.directMessage._id
    });

    if (!message.text) {
      throw new Error('Message text is required');
    }

    let fileUrl: string | undefined;
    let fileInfo: any = undefined;
    if (message.fileData && message.fileName && message.fileType) {
      try {
        logger.debug('Processing file attachment for DM', {
          fileName: message.fileName,
          fileType: message.fileType,
          fileSize: message.fileData.length
        });

        // Save the file using the file storage service
        fileUrl = await fileStorageService.saveFile(
          message.fileData,
          message.fileName,
          message.fileType
        );

        fileInfo = {
          fileName: message.fileName,
          fileType: message.fileType,
          fileUrl: `/files/${fileUrl}`, // Use the relative path
          fileSize: message.fileSize
        };

        logger.debug('DM file saved successfully', { fileName: message.fileName, fileUrl });
      } catch (error: any) {
        logger.error('Failed to process DM file attachment', {
          fileName: message.fileName,
          error: error instanceof Error ? error.message : String(error)
        });
        throw new Error(`Failed to process file attachment: ${error.message}`);
      }
    }

    const sentMessage = await DirectMessageService.sendDirectMessage(
      message.text,
      user.username,
      ws.directMessage._id as Types.ObjectId,
      fileInfo
    );

    const formattedMessage = {
      type: 'directMessage',
      _id: sentMessage._id,
      text: sentMessage.text,
      username: sentMessage.username,
      createdAt: sentMessage.createdAt,
      status: sentMessage.status || 'sent',
      fileInfo,
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
      directMessageId: ws.directMessage._id,
      sender: user.username,
      receiver: receiverUsername,
      messageId: sentMessage._id,
      clientMessageId: message.clientMessageId,
      hasFile: !!fileUrl,
      sentCount
    });
  }

  /**
   * Handles ping messages (keep-alive)
   */
  static async handlePing(ws: ExtendedWebSocket): Promise<void> {
    ws.send(JSON.stringify({ type: 'pong' }));
  }

  /**
   * Handles online status subscription
   */
  static async handleSubscribeOnlineStatus(
    ws: ExtendedWebSocket,
    message: OnlineStatusSubscription,
    token: string
  ): Promise<void> {
    const user = await verifyToken(token);
    ws.user = user;

    // Initialize the subscribed teams set
    if (!ws.subscribedTeams) {
      ws.subscribedTeams = new Set();
    }

    const { teamName } = message;
    const team = await Team.findOne({ name: teamName });

    if (!team) {
      throw new Error(`Team with name "${teamName}" not found`);
    }

    // Add to subscribed teams
    ws.subscribedTeams.add(teamName);

    // Get members of this team
    const members = await OnlineStatusService.getTeamSubscribers(team._id as Schema.Types.ObjectId);

    // Get status for all team members
    const statuses = await OnlineStatusService.getUserOnlineStatus(members);

    // Send current status to client
    for (const status of statuses) {
      ws.send(
        JSON.stringify({
          type: 'statusUpdate',
          username: status.username,
          status: status.status,
          lastSeen: status.lastSeen.toISOString()
        })
      );
    }

    logger.debug('Subscribed to online status', {
      username: user.username,
      teamName,
      memberCount: members.length
    });
  }

  /**
   * Handles status updates
   */
  static async handleSetStatus(
    ws: ExtendedWebSocket,
    message: StatusMessage,
    wss: WebSocketServer,
    token: string
  ): Promise<void> {
    const user = await verifyToken(token);
    ws.user = user;

    const { status } = message;
    // Validate status enum
    if (!Object.values(Status).includes(status)) {
      throw new Error('Invalid status');
    }

    const userStatus = await OnlineStatusService.setUserStatus(
      user._id as Schema.Types.ObjectId,
      user.username,
      status
    );

    // Broadcast to all subscribers
    await broadcastStatusUpdate(wss, user.username, status, userStatus.lastSeen);

    logger.debug('User status updated', {
      username: user.username,
      status
    });
  }

  /**
   * Handles typing indicators
   */
  static async handleTyping(
    ws: ExtendedWebSocket,
    message: TypingMessage,
    wss: WebSocketServer,
    token: string
  ): Promise<void> {
    const user = await verifyToken(token);

    if (message.channelName) {
      // Channel typing indicator
      let sentCount = 0;
      wss.clients.forEach(client => {
        const extendedClient = client as ExtendedWebSocket;
        if (
          extendedClient.readyState === WebSocket.OPEN &&
          extendedClient.channel &&
          extendedClient.channel.name === message.channelName &&
          extendedClient.team &&
          extendedClient.team.name === message.teamName
        ) {
          extendedClient.send(
            JSON.stringify({
              type: 'typing',
              username: user.username,
              isTyping: message.isTyping,
              teamName: message.teamName,
              channelName: message.channelName
            })
          );
          sentCount++;
        }
      });

      logger.debug('Channel typing indicator sent', {
        username: user.username,
        teamName: message.teamName,
        channelName: message.channelName,
        isTyping: message.isTyping,
        sentCount
      });
    } else if (message.receiverUsername) {
      // Direct message typing indicator
      let sentCount = 0;
      wss.clients.forEach(client => {
        const extendedClient = client as ExtendedWebSocket;
        if (
          extendedClient.readyState === WebSocket.OPEN &&
          extendedClient.user &&
          (extendedClient.user.username === message.receiverUsername ||
            extendedClient.user.username === user.username)
        ) {
          extendedClient.send(
            JSON.stringify({
              type: 'typing',
              username: user.username,
              isTyping: message.isTyping,
              teamName: message.teamName,
              receiverUsername: message.receiverUsername
            })
          );
          sentCount++;
        }
      });

      logger.debug('DM typing indicator sent', {
        username: user.username,
        receiverUsername: message.receiverUsername,
        isTyping: message.isTyping,
        sentCount
      });
    }
  }

  /**
   * Handles message acknowledgments
   */
  static async handleMessageAck(
    ws: ExtendedWebSocket,
    message: MessageAck,
    wss: WebSocketServer,
    token: string
  ): Promise<void> {
    const user = await verifyToken(token);
    ws.user = user;

    const { messageId, status, clientMessageId } = message;

    logger.debug('Message acknowledgment received', {
      username: user.username,
      messageId,
      status,
      clientMessageId
    });

    try {
      // Check if this is a direct message first
      const dMessage = await DMessage.findById(messageId);

      if (dMessage) {
        // This is a direct message, find the directMessage it belongs to
        const directMessage = await DirectMessage.findOne({
          dmessages: messageId
        })
          .populate('users')
          .exec();

        if (directMessage) {
          // Forward ack to all other participants
          const otherUsers = directMessage.users.filter(u => String(u) !== String(user._id));

          // Forward ack to all other participants
          otherUsers.forEach(otherUserId => {
            wss.clients.forEach(client => {
              const extClient = client as ExtendedWebSocket;
              if (
                extClient.readyState === WebSocket.OPEN &&
                extClient.user &&
                String(extClient.user._id) === String(otherUserId)
              ) {
                extClient.send(
                  JSON.stringify({
                    type: 'messageAck',
                    messageId,
                    status,
                    username: user.username,
                    // Include clientMessageId if provided
                    ...(clientMessageId && { clientMessageId })
                  })
                );
              }
            });
          });

          // Update message status in database if needed
          if (status === 'read' || status === 'delivered') {
            await DirectMessageService.updateMessageStatus(messageId, status);
          }
        }
      } else {
        // Check if this is a channel message
        const channelMessage = await Message.findById(messageId);

        if (channelMessage) {
          await ChannelService.updateMessageStatus(messageId, status);
        } else {
          throw new Error(`Message ${messageId} not found`);
        }
      }
    } catch (error) {
      logger.error('Error processing message acknowledgment', {
        messageId,
        status,
        clientMessageId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Handles fetching message history with pagination
   */
  static async handleFetchHistory(
    ws: ExtendedWebSocket,
    message: FetchHistoryMessage,
    token: string
  ): Promise<void> {
    const user = await verifyToken(token);
    ws.user = user;

    const { teamName, channelName, username, before, limit = 50, requestId } = message;
    const MAX_LIMIT = 100; // Maximum number of messages per request

    // Apply limit constraints
    const actualLimit = Math.min(limit, MAX_LIMIT);

    let messages: Array<{
      _id: string;
      text: string;
      username: string;
      createdAt: Date;
      status?: string;
    }> = [];
    let hasMore = false;

    try {
      if (channelName) {
        // Fetch channel messages with pagination
        const { team: _team, channel } = await findTeamAndChannel(
          teamName,
          channelName,
          user._id as Schema.Types.ObjectId,
          user.role
        );

        const messagesQuery = before
          ? { channel: channel._id, _id: { $lt: new Types.ObjectId(before) } }
          : { channel: channel._id };

        // Get messages with pagination
        messages = await ChannelService.getMessagesByCriteria(
          messagesQuery,
          actualLimit + 1 // Fetch one extra to determine if there are more
        );

        // Check if there are more messages
        if (messages.length > actualLimit) {
          hasMore = true;
          messages = messages.slice(0, actualLimit);
        }
      } else if (username) {
        // Fetch direct messages with pagination
        const { directMessage } = await findOrCreateDirectMessage(
          user._id as Schema.Types.ObjectId,
          teamName,
          username
        );

        const messagesQuery = before
          ? { directMessage: directMessage._id, _id: { $lt: new Types.ObjectId(before) } }
          : { directMessage: directMessage._id };

        // Get messages with pagination
        messages = await DirectMessageService.getMessagesByCriteria(
          messagesQuery,
          actualLimit + 1 // Fetch one extra to determine if there are more
        );

        // Check if there are more messages
        if (messages.length > actualLimit) {
          hasMore = true;
          messages = messages.slice(0, actualLimit);
        }
      } else {
        throw new Error('Either channelName or username must be provided');
      }

      // Send messages to client
      ws.send(
        JSON.stringify({
          type: 'historyResponse',
          messages: messages.map(
            (msg: {
              _id: string;
              text: string;
              username: string;
              createdAt: Date;
              status?: string;
            }) => ({
              _id: msg._id,
              text: msg.text,
              username: msg.username,
              createdAt: msg.createdAt,
              status: msg.status || 'delivered'
            })
          ),
          hasMore,
          before,
          // Include request ID if provided for correlation
          ...(requestId && { requestId })
        })
      );

      logger.debug('Sent message history', {
        username: user.username,
        teamName,
        channelName,
        directMessageUser: username,
        count: messages.length,
        hasMore,
        requestId
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error fetching message history', {
        teamName,
        channelName,
        username,
        requestId,
        error: errorMessage
      });

      ws.send(
        JSON.stringify({
          type: 'error',
          message: `Failed to fetch message history: ${errorMessage}`,
          ...(requestId && { requestId })
        })
      );
    }
  }
}

/**
 * Main message handler dispatcher
 */
const handleWebSocketMessage = async (
  ws: ExtendedWebSocket,
  message: BaseMessage,
  wss: WebSocketServer,
  token: string
): Promise<void> => {
  try {
    switch (message.type) {
      case 'join':
        await MessageHandlers.handleJoin(ws, message as ChannelMessage, wss, token);
        break;
      case 'message':
        await MessageHandlers.handleMessage(ws, message as ChannelMessage, wss, token);
        break;
      case 'joinDirectMessage':
        await MessageHandlers.handleJoinDirectMessage(ws, message as DirectMessagePayload, token);
        break;
      case 'directMessage':
        await MessageHandlers.handleDirectMessage(ws, message as DirectMessagePayload, wss, token);
        break;
      case 'ping':
        await MessageHandlers.handlePing(ws);
        break;
      case 'subscribeOnlineStatus':
        await MessageHandlers.handleSubscribeOnlineStatus(
          ws,
          message as OnlineStatusSubscription,
          token
        );
        break;
      case 'setStatus':
        await MessageHandlers.handleSetStatus(ws, message as StatusMessage, wss, token);
        break;
      case 'typing':
        await MessageHandlers.handleTyping(ws, message as TypingMessage, wss, token);
        break;
      case 'messageAck':
        await MessageHandlers.handleMessageAck(ws, message as MessageAck, wss, token);
        break;
      case 'fetchHistory':
        await MessageHandlers.handleFetchHistory(ws, message as FetchHistoryMessage, token);
        break;
      default:
        throw new Error(`Unknown message type: ${(message as any).type}`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error(`Error handling message type ${message.type}`, { error: errorMessage });
    ws.send(JSON.stringify({ type: 'error', message: errorMessage }));
  }
};

/**
 * Sets up WebSocket server
 */
export const setupWebSocketServer = async (server: any): Promise<WebSocketServer> => {
  const wss = new WebSocketServer({
    server,
    // Increase max payload size to 10MB (default is 100KB)
    maxPayload: 10 * 1024 * 1024,
    // Add permessage-deflate for compression
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      // Below controls whether to compress small messages
      threshold: 1024 // Only compress messages larger than 1KB
    }
  });

  // Set up connection manager
  const connectionManager = new ConnectionManager(wss);

  // Set up client health checker
  const healthChecker = new ClientHealthChecker(wss);
  healthChecker.start();

  // Set up metrics collection
  const metrics = new WebSocketMetrics(wss);

  // Create a simple API endpoint for metrics (if in development mode)
  if (process.env.NODE_ENV !== 'production') {
    server.on('request', (req: any, res: any) => {
      if (req.url === '/api/ws-metrics' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(metrics.getMetrics(), null, 2));
      }
    });
  }

  // Generate unique session IDs for connections
  let connectionCounter = 0;

  wss.on('connection', async (ws: ExtendedWebSocket, req) => {
    const sessionId = `session_${Date.now()}_${++connectionCounter}`;
    ws.sessionId = sessionId;
    ws.lastActivity = new Date();

    // Set up health check ping/pong for this client
    healthChecker.setupClient(ws);

    // Track the new connection
    connectionManager.trackConnection(ws);

    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token') as string;

    logger.info('WebSocket connection established', {
      sessionId,
      ip: req.socket.remoteAddress
    });

    if (!token) {
      logger.warn('No token provided', { sessionId });
      ws.close(1000, 'No token provided');
      return;
    }

    try {
      const user = await verifyToken(token);
      logger.info('User authenticated', {
        sessionId,
        userId: user._id,
        username: user.username
      });

      // Store user reference in WebSocket object
      ws.user = user;

      // Check for concurrent connection limits
      let concurrentConnections = 0;
      wss.clients.forEach(client => {
        const extClient = client as ExtendedWebSocket;
        if (extClient.user && extClient.user.username === user.username) {
          concurrentConnections++;
        }
      });

      if (concurrentConnections > CONFIG.MAX_CONCURRENT_CONNECTIONS_PER_USER) {
        logger.warn('Too many concurrent connections', {
          username: user.username,
          connections: concurrentConnections,
          sessionId
        });
        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Too many concurrent connections'
          })
        );
        ws.close(4000, 'Too many concurrent connections');
        return;
      }

      // Track user connection
      await OnlineStatusService.trackUserConnection(
        user._id as Schema.Types.ObjectId,
        user.username
      );

      // Broadcast online status
      const now = new Date();
      await broadcastStatusUpdate(wss, user.username, Status.ONLINE, now);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Authentication error', { sessionId, error: errorMessage });
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
      ws.close(1000, 'Invalid token');
      return;
    }

    ws.on('message', async data => {
      try {
        // Apply rate limiting
        if (!ws.user || !defaultRateLimiter.isAllowed(ws.user.username)) {
          logger.warn('Rate limit exceeded', {
            sessionId,
            username: ws.user?.username
          });
          ws.send(
            JSON.stringify({
              type: 'error',
              message: 'Message rate limit exceeded. Please slow down.'
            })
          );
          return;
        }

        const messageStr = data.toString();
        const message = JSON.parse(messageStr) as BaseMessage;

        logger.debug('Received message', {
          sessionId,
          type: message.type,
          size: messageStr.length
        });

        if (Object.values(MessageType).includes(message.type as MessageType)) {
          await handleWebSocketMessage(ws, message, wss, token);
        } else {
          logger.warn('Unknown message type', {
            sessionId,
            type: message.type
          });
          ws.send(
            JSON.stringify({
              type: 'error',
              message: `Unknown message type: ${message.type}`
            })
          );
        }
      } catch (error) {
        logger.error('Message handling error', {
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Message handling error'
          })
        );
      }
    });

    ws.on('close', async (code, reason) => {
      logger.info('WebSocket connection closed', {
        sessionId,
        code,
        reason: reason.toString()
      });

      if (ws.user) {
        await OnlineStatusService.trackUserDisconnection(
          ws.user._id as Schema.Types.ObjectId,
          ws.user.username
        );

        try {
          await handleDisconnection(ws.user._id as Schema.Types.ObjectId, ws.user.username, wss);
        } catch (error) {
          logger.error('Error handling disconnection', {
            sessionId,
            userId: ws.user._id,
            username: ws.user.username,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    });

    ws.on('error', error => {
      logger.error('WebSocket error', {
        sessionId,
        error: error.message
      });
    });
  });

  return wss;
};

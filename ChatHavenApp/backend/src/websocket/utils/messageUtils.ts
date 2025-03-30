import { Schema } from 'mongoose';
import { createLogger } from '../../utils/logger';
import User from '../../models/User';
import Team from '../../models/Team';
import TeamMember from '../../models/TeamMember';
import DirectMessage from '../../models/DirectMessage';
import DirectMessageService from '../../services/directMessageService';
import { ERROR_MESSAGES } from '../constants';

// Setup structured logging
const logger = createLogger('MessageUtils');

/**
 * Finds or creates a direct message between two users
 * @param userId User ID
 * @param teamName Team name
 * @param username Username
 * @returns Team, receiver user, and direct message
 */
export const findOrCreateDirectMessage = async (
    userId: Schema.Types.ObjectId,
    teamName: string,
    username: string
): Promise<{ team: any; receiver: any; directMessage: any }> => {
    const team = await Team.findOne({ name: teamName }).exec();
    if (!team) throw new Error(ERROR_MESSAGES.TEAM_NOT_FOUND(teamName));

    const user1 = await User.findById(userId).exec();
    if (!user1) throw new Error(ERROR_MESSAGES.USER_NOT_FOUND(userId.toString()));

    if (user1.role !== 'SUPER_ADMIN') {
        const teamMember = await TeamMember.findOne({ user: userId, team: team._id }).exec();
        if (!teamMember) throw new Error(ERROR_MESSAGES.USER_NOT_TEAM_MEMBER(teamName));
    }

    const user2 = await User.findOne({ username }).exec();
    if (!user2) throw new Error(ERROR_MESSAGES.USERNAME_NOT_FOUND(username));

    // Handle self-messaging case specially to avoid confusion
    if (user1.username === user2.username) {
        throw new Error(ERROR_MESSAGES.SELF_MESSAGING);
    }

    // Verify receiver is a team member
    if (user2.role !== 'SUPER_ADMIN') {
        const teamMember = await TeamMember.findOne({ user: user2._id, team: team._id }).exec();
        if (!teamMember) throw new Error(ERROR_MESSAGES.USER_NOT_TEAM_MEMBER(teamName));
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
 * Format a message for sending to clients
 * @param message The message to format
 * @param clientMessageId Optional client message ID to include
 * @returns Formatted message object
 */
export const formatMessage = (message: any, clientMessageId?: string): any => {
    return {
        _id: message._id,
        text: message.text,
        username: message.username,
        createdAt: message.createdAt,
        status: message.status || 'sent',
        ...(message.fileName && message.fileUrl && {
            fileName: message.fileName,
            fileType: message.fileType,
            fileUrl: message.fileUrl,
            fileSize: message.fileSize
        }),
        ...(message.quotedMessage && {
            quotedMessage: {
                _id: message.quotedMessage._id,
                text: message.quotedMessage.text,
                username: message.quotedMessage.username
            }
        }),
        // Echo back the client message ID if provided
        ...(clientMessageId && { clientMessageId })
    };
};
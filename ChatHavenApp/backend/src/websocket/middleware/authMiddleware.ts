import jwt from 'jsonwebtoken';
import { createLogger } from '../../utils/logger';
import User, { IUser } from '../../models/User';
import Team, { ITeam } from '../../models/Team';
import TeamMember, { ITeamMember } from '../../models/TeamMember';
import Channel, { IChannel } from '../../models/Channel';
import { ExtendedWebSocket, DecodedToken, ChannelMessage } from '../../types/websocket';
import { Role } from '../../enums';
import { Schema } from 'mongoose';
import { CONFIG, ERROR_MESSAGES } from '../constants';

// Setup structured logging
const logger = createLogger('AuthMiddleware');

/**
 * Verifies JWT token and retrieves the associated user
 * @param token JWT token to verify
 * @returns Authenticated user
 */
export const verifyToken = async (token: string): Promise<IUser> => {
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
 * @param teamName Team name
 * @param channelName Channel name
 * @param userId User ID
 * @param userRole User role
 * @returns Team, TeamMember, and Channel objects
 */
export const findTeamAndChannel = async (
    teamName: string,
    channelName: string,
    userId: Schema.Types.ObjectId,
    userRole: Role
): Promise<{ team: ITeam; teamMember?: ITeamMember; channel: IChannel }> => {
    const team = await Team.findOne({ name: teamName }).exec();
    if (!team) throw new Error(ERROR_MESSAGES.TEAM_NOT_FOUND(teamName));

    let teamMember;
    if (userRole !== Role.SUPER_ADMIN) {
        teamMember = await TeamMember.findOne({ user: userId, team: team._id }).exec();
        if (!teamMember) throw new Error(ERROR_MESSAGES.USER_NOT_TEAM_MEMBER(teamName));
    }

    const channel = await Channel.findOne({ name: channelName, team: team._id }).exec();
    if (!channel) throw new Error(ERROR_MESSAGES.CHANNEL_NOT_FOUND(channelName, teamName));

    return { team, teamMember, channel };
};

/**
 * Authorizes a user for channel access
 * @param ws WebSocket connection
 * @param message Channel message
 * @param token JWT token
 */
export const authorizeUserForChannel = async (
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
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED_CHANNEL);
    }
};
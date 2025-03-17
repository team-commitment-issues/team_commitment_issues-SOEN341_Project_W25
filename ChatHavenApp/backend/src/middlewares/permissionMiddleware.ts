import { Request, Response, NextFunction } from 'express';
import { TeamRole, Role } from '../enums';
import TeamMember from '../models/TeamMember';
import Team from '../models/Team';
import Channel from '../models/Channel';
import DirectMessage from '../models/DirectMessage';
import User from '../models/User';

/**
 * Middleware to check if the user has the required permission based on their role.
 * 
 * @param Role role - The role required to access the resource. See {@link Role} for possible values.
 * @returns Middleware function that checks the user's role and grants or denies access.
 * 
 * - Sends a **403** status when the user doesn't have the required role.
 * 
 * @example
 * // Usage in an Express route
 * app.get('/EXAMPLE_ROUTE', authenticate, checkUserPermission(Role.SUPER_ADMIN), (req, res) => {
 *   res.send('You have permission to access this resource');
 * });
 * 
 * @remarks This middleware should only be used after the `authenticate` middleware to ensure the user is authenticated.
 */
function checkUserPermission(role: Role) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (req.user.role === role) {
            return next();
        } else if (req.user.role === Role.SUPER_ADMIN) {
            return next();
        }
        else {
            res.status(403).json({'Forbidden': 'User does not have permission to access this resource'});
            return;
        }
    }
}

/**
 * Middleware factory that creates permission checking middleware for team-related operations.
 * 
 * @param TeamRole teamRole - The minimum team role required to access the route. See {@link TeamRole} for possible values.
 * @returns Middleware function that checks the user's team role and grants or denies access.
 * - Sends a **404** status when the team or team member is not found
 * - Sends a **403** status when the user doesn't have sufficient permissions
 * 
 * It populates `req.team` with the team found in the body of the request and `req.teamMember` with the user's team membership.
 * 
 * The permission hierarchy works as follows:
 * - SUPER_ADMINs always have access to all teams regardless of team role
 * - Team ADMINs have access to all team resources regardless of the required role
 * - Other users must have exactly the specified team role to gain access
 * 
 * @example
 * // Usage in an Express route
 * app.get('/EXAMPLE_ROUTE', authenticate, checkUserPermission(Role.USER), checkTeamPermission(TeamRole.ADMIN), (req, res) => {
 *  res.send('You have permission to access this resource');
 * });
 * 
 * @remarks This middleware should be used after the `authenticate` and {@link checkUserPermission} middleware to ensure the user is authenticated.
 */
function checkTeamPermission(teamRole: TeamRole) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const team = await Team.findOne({ name: req.body.teamName });
        if (!team) {
            res.status(404).json({'Not Found': 'Team not found'});
            return;
        }
        req.team = team;

        if (req.user.role === Role.SUPER_ADMIN) {
            return next();
        }

        const teamMember = await TeamMember.findOne({ user: req.user._id, team: team._id }).populate('channels');
        if (!teamMember) {
            res.status(404).json({'Not Found': 'Team member not found'});
            return;
        }

        req.teamMember = teamMember;
        if (teamMember.role === teamRole) {
            return next();
        } else if (teamMember.role === TeamRole.ADMIN) {
            req.teamMember = teamMember;
            return next();
        }
        else {
            res.status(403).json({'Forbidden': 'User does not have permission to access this resource'});
            return;
        }
    }
}

/**
 * Middleware factory that creates permission checking middleware for channel-related operations.
 * 
 * @returns Middleware function that checks the user's permissions and grants or denies access.
 * - Sends a **404** status when the channel or team member is not found
 * - Sends a **403** status when the user doesn't have sufficient permissions
 * 
 * It populates `req.channel` with the channel found in the body of the request and `req.teamMember` with the user's team membership.
 * 
 * The permission hierarchy works as follows:
 * - SUPER_ADMINs always have access to all channels
 * - Team ADMINs have access to all channels in their team
 * - Other users must be a member of the channel to gain access
 * 
 * @example
 * // Usage in an Express route
 * app.get('/EXAMPLE_ROUTE', authenticate, checkUserPermission(Role.USER), checkTeamPermission(TeamRole.ADMIN), checkChannelPermission(), (req, res) => {
 *  res.send('You have permission to access this resource');
 * });
 * 
 * @remarks This middleware should be used after the `authenticate`, {@link checkUserPermission} and {@link checkTeamPermission} middlewares to ensure the user is authenticated and has access to the team.
 */
function checkChannelPermission() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const channel = await Channel.findOne({ name: req.body.channelName, team: req.team._id }).populate('members');
        if (!channel) {
            res.status(404).json({'Not Found': 'Channel not found'});
            return;
        }
        req.channel = channel;

        if (req.user.role === Role.SUPER_ADMIN) {
            return next();
        }

        if (req.teamMember.role === TeamRole.ADMIN) {
            return next();
        }

        TeamMember.findOne({ user: req.user._id, team: req.team._id }).then((teamMember) => {
            if (!teamMember) {
                res.status(404).json({'Not Found': 'Team member not found'});
                return;
            }
            req.teamMember = teamMember;
        });
        return next();
    }
}
/**
 * Middleware factory that creates permission checking middleware for direct message-related operations.
 * @returns Middleware function that checks the user's permissions and grants or denies access.
 * - Sends a **404** status when the direct message, receiver, or team member is not found
 * - Sends a **403** status when the user doesn't have sufficient permissions
 *
 * It populates `req.dm` with the direct message found in the body of the request.
 * 
 * The permission hierarchy works as follows:
 * - SUPER_ADMINs always have access to all direct messages
 * - Team members must be part of the direct message to gain access
 * 
 * @example
 * // Usage in an Express route
 * app.get('/EXAMPLE_ROUTE', authenticate, checkUserPermission(Role.USER), checkTeamPermission(TeamRole.ADMIN), checkDirectMessagePermission(), (req, res) => {
 *  res.send('You have permission to access this resource');
 * });
 * 
 * @remarks This middleware should be used after the `authenticate`, {@link checkUserPermission} and {@link checkTeamPermission} middlewares to ensure the user is authenticated and has access to the team.
 */
function checkDirectMessagePermission() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const receiverUsername = req.body.receiver;
            const receiverUser = await User.findOne({ username: { $eq: receiverUsername } });
            if (!receiverUser) {
                res.status(404).json({'Not Found': 'Receiver not found'});
                return;
            }
            if (receiverUser.role !== Role.SUPER_ADMIN) {
                const receiver = await TeamMember.findOne({ user: receiverUser._id, team: req.team._id });
                if (!receiver) {
                    res.status(404).json({'Not Found': 'Team member not found'});
                    return;
                }
            }
            const dm = await DirectMessage.findOne({ users: { $all: [req.user._id, receiverUser._id] } });
            if (!dm) {
                res.status(404).json({'Not Found': 'Direct message not found'});
                return;
            }
            req.dm = dm;

            return next();
        } catch (error: any) {
            res.status(500).json({'Error': 'An error occurred while processing your request', 'Details': error.message});
        }
    }
}

export { checkUserPermission, checkTeamPermission, checkChannelPermission, checkDirectMessagePermission };
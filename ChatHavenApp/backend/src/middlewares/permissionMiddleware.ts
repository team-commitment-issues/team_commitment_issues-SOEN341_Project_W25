import { Request, Response, NextFunction } from 'express';
import { TeamRole, Role } from '../enums';
import TeamMember from '../models/TeamMember';
import Team from '../models/Team';
import Channel from '../models/Channel';
import DirectMessage from '../models/DirectMessage';
import User from '../models/User';

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

function checkDirectMessagePermission() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const receiverUsername = req.body.teamMember;
            const receiverUser = await User.findOne({ username: { $eq: receiverUsername } });
            if (!receiverUser) {
                res.status(404).json({'Not Found': 'Receiver not found'});
                return;
            }
            const receiver = await TeamMember.findOne({ user: receiverUser._id, team: req.team._id });
            if (!receiver) {
                res.status(404).json({'Not Found': 'Receiver not found'});
                return;
            }
            if (req.user.role === Role.SUPER_ADMIN) {
                const dm = await DirectMessage.findOne({ teamMembers: { $all: [receiver._id] } });
                if (!dm) {
                    res.status(404).json({'Not Found': 'Direct message not found'});
                    return;
                }
                req.dm = dm;
                return next();
            }
            const dm = await DirectMessage.findOne({ teamMembers: { $all: [req.teamMember._id, receiver._id] } });
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
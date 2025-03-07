import { Request, Response, NextFunction } from 'express';
import { TeamRole, Role } from '../enums';
import TeamMember from '../models/TeamMember';
import Team from '../models/Team';
import Channel from '../models/Channel';

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

export { checkUserPermission, checkTeamPermission, checkChannelPermission };
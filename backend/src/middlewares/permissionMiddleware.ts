import { Request, Response, NextFunction } from 'express';
import { TeamRole, Role } from '../enums';
import { Types } from 'mongoose';
import User from '../models/User';
import TeamMember from '../models/TeamMember';
import Team from '../models/Team';

function checkPermission(role: TeamRole | Role) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (!req.user) {
            res.status(401).json({'Unauthorized': 'No token provided'});
            return;
        }
        const user = await User.findById(req.user._id).populate('teamMemberships');

        if (!user) {
            res.status(404).json({'Not Found': 'User not found'});
            return;
        }

        if (user.role === Role.SUPER_ADMIN) {
            return next();
        }
        const team = req.body.team; // _id of the team

        if (!team) {
            res.status(400).json({'Bad Request': 'Team is required'});
            return;
        } else if (!Types.ObjectId.isValid(team)) {
            res.status(400).json({'Bad Request': 'Invalid team ID'});
            return;
        }

        const teamExists = await Team.findById(team);
        if (!teamExists) {
            res.status(404).json({error: 'Team not found'});
            return;
        }

        const teamMember = await TeamMember.findOne({ team, user: user._id });
        if (!teamMember) {
            res.status(403).json({ error: 'You do not have permission to access this resource' });
            return;
        }

        if (role === TeamRole.MEMBER) {
            if (teamMember.role !== TeamRole.MEMBER && teamMember.role !== TeamRole.ADMIN) {
            res.status(403).json({ error: 'You do not have permission to access this resource' });
            return;
            }
        } else if (role === TeamRole.ADMIN) {
            if (teamMember.role !== TeamRole.ADMIN) {
            res.status(403).json({ error: 'You do not have permission to access this resource' });
            return;
            }
        } else if (user.role !== role) {
            res.status(403).json({ error: 'You do not have permission to access this resource' });
            return;
        }

        return next();
    };
}

export default checkPermission;
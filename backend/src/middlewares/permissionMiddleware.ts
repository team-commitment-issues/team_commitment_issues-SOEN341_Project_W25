import { Request, Response, NextFunction } from 'express';
import { TeamRole, Role } from '../enums';
import { Types } from 'mongoose';
import User from '../models/User';
import TeamMember from '../models/TeamMember';

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

        const teamMember = await TeamMember.findOne({ team, user: user._id });
        if (!teamMember || (teamMember.role !== role && user.role !== role)) {
            res.status(403).json({ 'Forbidden': 'You do not have permission to access this resource' });
            return;
        }

        return next();
    };
}

export default checkPermission;
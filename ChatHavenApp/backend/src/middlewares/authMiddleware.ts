import { Request, Response, NextFunction } from 'express';
import User, { IUser } from '../models/User';
import { ITeam } from '../models/Team';
import { ITeamMember } from '../models/TeamMember';
import { IChannel } from '../models/Channel';
import { IMessage } from '../models/Message';
import { IDirectMessage } from '../models/DirectMessage';
import jwt from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            user: IUser;
            team: ITeam;
            teamMember: ITeamMember;
            channel: IChannel;
            message: IMessage;
            dm: IDirectMessage;
        }
    }
}

/**
 * Middleware to authenticate a user using a JWT token.
 * Make sure user is logged in before accessing protected routes.
 * 
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @param {NextFunction} next - The next middleware function.
 * @returns {void}
 */
async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Unauthorized: No token provided' });
        return;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!);
        const user = await User.findOne({ username: (decoded as any).username });
        if (!user) {
            res.status(401).json({ error: 'Unauthorized: User not found' });
            return;
        }
        req.user = user;
        next();
    } catch (err) {
        res.status(403).json({ error: 'Unauthorized: Invalid token' });
        return;
    }
}

export default authenticate;
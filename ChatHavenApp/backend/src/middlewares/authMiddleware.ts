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
 * Middleware to authenticate a user based on the provided JWT token in the request headers.
 * 
 * @param req - The request object containing the authorization header with the JWT token.
 * @param res - The response object used to send back the appropriate HTTP status and error messages.
 * @param next - The next middleware function to be called if authentication is successful.
 * 
 * @returns A promise that resolves to void. 
 * - Sends a **401** status with an error message if no token is provided or if the user is not found.
 * - Sends a **403** status with an error message if the token is invalid.
 * 
 * @example
 * // Usage in an Express route
 * app.get('/EXAMPLE_ROUTE', authenticate, (req, res) => {
 *   res.send('You are authenticated');
 * });
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
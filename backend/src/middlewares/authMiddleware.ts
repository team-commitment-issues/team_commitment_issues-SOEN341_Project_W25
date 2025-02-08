import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import jwt from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Unauthorized: No token provided' });
        return;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!);
        const user = await User.findOne({ userID: (decoded as any).userID });
        if (!user) {
            res.status(401).json({ error: 'Unauthorized: User not found' });
            return;
        }
        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
        return;
    }
}

export default authenticate;
import { Request, Response } from 'express';
import { Schema, Types } from 'mongoose';
import OnlineStatusService from '../services/onlineStatusService';

type StatusType = 'online' | 'away' | 'busy' | 'offline';

class OnlineStatusController {
    static async getUserOnlineStatus(req: Request, res: Response): Promise<void> {
        try {
            const usernames = req.body.usernames;
            if (!usernames || !Array.isArray(usernames)) {
                res.status(400).json({ error: 'Invalid request. Expected array of usernames.' });
                return;
            }

            const statuses = await OnlineStatusService.getUserOnlineStatus(usernames);
            
            const formattedStatuses = statuses.map(status => ({
                username: status.username,
                status: status.status,
                lastSeen: status.lastSeen
            }));

            res.status(200).json({
                statuses: formattedStatuses,
            });
        } catch (err) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async setUserStatus(req: Request, res: Response): Promise<void> {
        try {
            const status = req.body.status as StatusType;
            const userId = req.user._id as Schema.Types.ObjectId;

            if (!status || !['online', 'away', 'busy', 'offline'].includes(status)) {
                res.status(400).json({ error: 'Invalid status. Must be one of: online, away, busy, offline' });
                return;
            }

            const updatedStatus = await OnlineStatusService.setUserStatus(
                userId,
                req.user.username,
                status as StatusType
            );

            res.status(200).json({
                success: true,
                username: req.user.username,
                status: updatedStatus.status,
                lastSeen: updatedStatus.lastSeen
            });
        } catch (err) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

export default OnlineStatusController;
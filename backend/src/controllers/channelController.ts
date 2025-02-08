import { Request, Response } from 'express';
import ChannelService from '../services/channelService';

class ChannelController {
    // **Create Channel**
    static async createChannel(req: Request, res: Response): Promise<void> {
        try {
            const { name } = req.body;
            const userID = req.user.userID;
            const newChannel = await ChannelService.createChannel(name, userID);

            res.status(201).json({
                message: 'Channel created successfully',
                channel: newChannel,
            });
        } catch (err) {
            if ((err as any).message === 'User not found or not an admin') {
                res.status(403).json({ error: 'User not found or not an admin' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }
}

export default ChannelController;
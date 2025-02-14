import { Request, Response } from 'express';
import ChannelService from '../services/channelService';

class ChannelController {
    // **Create Channel**
    static async createChannel(req: Request, res: Response): Promise<void> {
        try {
            const { name, team } = req.body;
            const userID = req.user.userID;
            const newChannel = await ChannelService.createChannel(name, userID, team);

            res.status(201).json({
                message: 'Channel created successfully',
                channel: newChannel,
            });
        } catch (err) {
            console.error('Error creating channel:', err); // Add this line to log the error
            if ((err as any).message === 'User not found or not an admin') {
                res.status(403).json({ error: 'User not found or not an admin' });
            } else if ((err as any).message === 'Team not found') {
                res.status(400).json({ error: 'Team is required' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    // **Add User to Channel**
    static async addUserToChannel(req: Request, res: Response): Promise<void> {
        try {
            const { channelID, userID } = req.body;
            const newChannel = await ChannelService.addUserToChannel(channelID, userID);

            res.status(201).json({
                message: 'User added to channel successfully',
                channel: newChannel,
            });
        } catch (err) {
            console.error('Error adding user to channel:', err); // Add this line to log the error
            if ((err as any).message === 'User not found') {
                res.status(404).json({ error: 'User not found' });
            } else if ((err as any).message === 'Channel not found') {
                res.status(404).json({ error: 'Channel not found' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }
}

export default ChannelController;
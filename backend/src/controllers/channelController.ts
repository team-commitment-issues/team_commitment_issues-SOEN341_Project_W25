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
            if ((err as any).message === 'User not found') {
                res.status(403).json({ error: 'User not found' });
            } else if ((err as any).message === 'Team not found') {
                res.status(400).json({ error: 'Team not found' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    // **Add User to Channel**
    static async addUserToChannel(req: Request, res: Response): Promise<void> {
        try {
            const { channelName, userID } = req.body;
            const newChannel = await ChannelService.addUserToChannel(channelName, userID);

            res.status(201).json({
                message: 'User added to channel successfully',
                channel: newChannel,
            });
        } catch (err) {
            if ((err as any).message === 'User not found') {
                res.status(404).json({ error: 'User not found' });
            } else if ((err as any).message === 'Channel not found') {
                res.status(404).json({ error: 'Channel not found' });
            } else if ((err as any).message === 'Team not found') {
                res.status(400).json({ error: 'Team not found' });
            } else if ((err as any).message === 'User not a member of the team') {
                res.status(403).json({ error: 'User not a member of the team' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    // **Send Message**
    static async sendMessage(req: Request, res: Response): Promise<void> {
        try {
            const { channelName, text } = req.body;
            const userID = req.user.userID;
            const newMessage = await ChannelService.sendMessage(channelName, userID, text);

            res.status(201).json({
                message: 'Message sent successfully'
            });
        } catch (err) {
            if ((err as any).message === 'User not found') {
                res.status(404).json({ error: 'User not found' });
            } else if ((err as any).message === 'Channel not found') {
                res.status(404).json({ error: 'Channel not found' });
            } else if ((err as any).message === 'User not a member of the channel') {
                res.status(403).json({ error: 'User not a member of the channel' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    // **Delete Channel**
    static async deleteChannel(req: Request, res: Response): Promise<void> {
        try {
            const { channelName } = req.body;
            const result = await ChannelService.deleteChannel(channelName);

            res.status(200).json({
                message: "Channel deleted successfully"
            });
        } catch (err) {
            if ((err as any).message === 'Channel not found') {
                res.status(404).json({ error: 'Channel not found' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    // **Get Messages**
    static async getMessages(req: Request, res: Response): Promise<void> {
        try {
            const { channelName } = req.body;
            const messages = await ChannelService.getMessages(channelName);

            res.status(200).json(messages);
        } catch (err) {
            if ((err as any).message === 'Channel not found') {
                res.status(404).json({ error: 'Channel not found' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }
}

export default ChannelController;
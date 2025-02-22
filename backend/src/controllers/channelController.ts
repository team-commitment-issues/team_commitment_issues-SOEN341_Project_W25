import { Request, Response } from 'express';
import ChannelService from '../services/channelService';
import { Schema, Types } from 'mongoose';

class ChannelController {
    // **Create Channel**
    static async createChannel(req: Request, res: Response): Promise<void> {
        try {
            const channelName = req.body.channelName;
            const teamMembers = req.body.selectedTeamMembers;
            const team = req.team._id as Types.ObjectId;
            const user = req.user._id as Types.ObjectId;
            const username = req.user.username;
            const role = req.user.role;
            const newChannel = await ChannelService.createChannel(team, channelName, user, username, role, teamMembers);

            res.status(201).json({
                message: 'Channel created successfully',
                channel: newChannel,
            });
        } catch (err) {
            if ((err as any).message === 'Channel already exists') {
                res.status(400).json({ error: 'Channel already exists' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    // **Add User to Channel**
    static async addUserToChannel(req: Request, res: Response): Promise<void> {
        try {
            const { username } = req.body;
            const team = req.team._id as Types.ObjectId;
            const channel = req.channel.name;
            const newChannel = await ChannelService.addUserToChannel(team, channel, username);

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
            const text = req.body.text;
            const channel = req.channel._id as Types.ObjectId;
            const teamMember = req.teamMember._id as Types.ObjectId;
            const newMessage = await ChannelService.sendMessage(channel, teamMember, text);

            res.status(201).json({
                message: 'Message sent successfully'
            });
        } catch (err) {
            console.log(err);
            if ((err as any).message === 'Channel not found') {
                res.status(404).json({ error: 'Channel not found' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    // **Delete Channel**
    static async deleteChannel(req: Request, res: Response): Promise<void> {
        try {
            const team = req.team._id as Types.ObjectId;
            const channel = req.channel._id as Types.ObjectId;
            const result = await ChannelService.deleteChannel(team, channel);

            res.status(200).json({
                message: "Channel deleted successfully"
            });
        } catch (err) {
            if ((err as any).message === 'Channel not found') {
                res.status(404).json({ error: 'Channel not found' });
            } else if ((err as any).message === 'Team not found') {
                res.status(404).json({ error: 'Team not found' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    // **Get Messages**
    static async getMessages(req: Request, res: Response): Promise<void> {
        try {
            const channel = req.channel._id as Types.ObjectId;
            const messages = await ChannelService.getMessages(channel);

            res.status(200).json(messages);
        } catch (err) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

export default ChannelController;
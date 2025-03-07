import { Request, Response } from 'express';
import { Schema, Types } from 'mongoose';
import DirectMessageService from '../services/directMessageService';

class DirectMessageController {

    static async createDirectMessage(req: Request, res: Response): Promise<void> {
        try {
            const teamMembers = req.body.teamMembers;
            const newDirectMessage = await DirectMessageService.createDirectMessage(teamMembers);

            res.status(201).json({
                message: 'Direct message created successfully',
                directMessage: newDirectMessage,
            });
        } catch (err) {
            if ((err as any).message === 'Direct message already exists') {
                res.status(400).json({ error: 'Direct message already exists' });
            } else if ((err as any).message === 'Team member not found') {
                res.status(404).json({ error: 'Team member not found' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    static async getDirectMessages(req: Request, res: Response): Promise<void> {
        try {
            const teamMembers = req.body.teamMembers;
            const directMessages = await DirectMessageService.getDirectMessages(teamMembers);

            res.status(200).json({
                directMessages: directMessages,
            });
        } catch (err) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async sendDirectMessage(req: Request, res: Response): Promise<void> {
        try {
            const teamMembers = req.body.teamMembers;
            const message = req.body.message;
            const newMessage = await DirectMessageService.sendDirectMessage(teamMembers, message);

            res.status(201).json({
                message: 'Direct message sent successfully',
                dmessage: newMessage,
            });
        } catch (err) {
            if ((err as any).message === 'Direct message not found') {
                res.status(404).json({ error: 'Direct message not found' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }
}

export default DirectMessageController;
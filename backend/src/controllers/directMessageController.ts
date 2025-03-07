import { Request, Response } from 'express';
import { Schema, Types } from 'mongoose';
import DirectMessageService from '../services/directMessageService';

class DirectMessageController {

    static async createDirectMessage(req: Request, res: Response): Promise<void> {
        try {
            const username = req.body.teamMember;
            const teamMember = req.teamMember._id as Schema.Types.ObjectId;
            const team = req.team._id as Schema.Types.ObjectId;
            const newDirectMessage = await DirectMessageService.createDirectMessage(username, teamMember, team);

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
            const dm = req.dm._id as Types.ObjectId;
            const directMessages = await DirectMessageService.getDirectMessages(dm);

            res.status(200).json({
                directMessages: directMessages,
            });
        } catch (err) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async sendDirectMessage(req: Request, res: Response): Promise<void> {
        try {
            const message = req.body.message;
            const directMessageId = req.body.directMessageId as Types.ObjectId;
            const senderId = req.body.senderId as Schema.Types.ObjectId;
            const newMessage = await DirectMessageService.sendDirectMessage(directMessageId, message, senderId);

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
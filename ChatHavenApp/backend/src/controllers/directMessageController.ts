import { Request, Response } from 'express';
import { Schema, Types } from 'mongoose';
import DirectMessageService from '../services/directMessageService';

class DirectMessageController {
  static async createDirectMessage(req: Request, res: Response): Promise<void> {
    try {
      const receiver = req.body.receiver;
      const team = req.team._id as Schema.Types.ObjectId;
      const sender = req.user._id as Schema.Types.ObjectId;
      const newDirectMessage = await DirectMessageService.createDirectMessage(
        receiver,
        sender,
        team
      );

      res.status(201).json({
        message: 'Direct message created successfully',
        directMessage: newDirectMessage
      });
    } catch (err) {
      if ((err as any).message === 'Direct message already exists') {
        res.status(400).json({ error: 'Direct message already exists' });
      } else if ((err as any).message === 'Team member not found') {
        res.status(404).json({ error: 'Team member not found' });
      } else if ((err as any).message === 'User not found') {
        res.status(404).json({ error: 'User not found' });
      } else if ((err as any).message === 'Invalid username') {
        res.status(400).json({ error: 'Invalid username' });
      } else {
        res.status(500).json({ error: 'Internal server error', details: err });
      }
    }
  }

  static async getDirectMessages(req: Request, res: Response): Promise<void> {
    try {
      const dm = req.dm._id as Types.ObjectId;
      const directMessages = await DirectMessageService.getDirectMessages(dm);
      res.status(200).json({
        directMessages: directMessages
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error', details: err });
    }
  }
}

export default DirectMessageController;

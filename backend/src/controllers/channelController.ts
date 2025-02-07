import { Request, Response } from 'express';
import ChannelService from '../services/channelService';

class ChannelController {
    static async createChannel(req: Request, res: Response) {
        try {
          const { name, description, userId } = req.body;
          if (!userId) {
            res.status(400).json({ error: 'userId is required' });
          }
    
          const channel = await ChannelService.createChannel(name, description, userId);
          res.status(201).json({ message: 'Channel created successfully', channel });
        } catch (error) {
          res.status(400).json({ error: (error as Error).message });
        }
      }

  static async addUserToChannel(req: Request, res: Response) {
    try {
      const { channelId, userId, role } = req.body;
      const channel = await ChannelService.addUserToChannel(channelId, userId, role);
      res.status(200).json({ message: 'User added to channel', channel });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async getUserChannels(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const channels = await ChannelService.getChannelsByUser(userId);
      res.status(200).json(channels);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
}

export default ChannelController;

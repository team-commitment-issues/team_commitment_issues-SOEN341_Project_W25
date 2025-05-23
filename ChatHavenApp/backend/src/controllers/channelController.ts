import { Request, Response } from 'express';
import ChannelService from '../services/channelService';
import { Schema, Types } from 'mongoose';
import { Role, TeamRole } from '../enums';

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
      const newChannel = await ChannelService.createChannel(
        team,
        channelName,
        user,
        username,
        role,
        teamMembers
      );

      res.status(201).json({
        message: 'Channel created successfully',
        channel: newChannel
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
        channel: newChannel
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

  // **Remove User from Channel**
  static async removeUserFromChannel(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.body;
      const team = req.team._id as Types.ObjectId;
      const channel = req.channel.name;
      const result = await ChannelService.removeUserFromChannel(
        team,
        channel,
        username,
        req.user.role
      );

      res.status(200).json({
        message: 'User removed from channel successfully'
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
      } else if ((err as any).message === 'Not authorized to remove user from channel') {
        res.status(403).json({ error: 'Not authorized to remove user from channel' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const messageId = req.body.messageId as Schema.Types.ObjectId;
      const channel = req.channel._id as Types.ObjectId;
      const result = await ChannelService.deleteMessage(channel, messageId);

      res.status(200).json({
        message: 'Message deleted successfully'
      });
    } catch (err) {
      if ((err as any).message === 'Message not found') {
        res.status(404).json({ error: 'Message not found' });
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
        message: 'Channel deleted successfully'
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
      console.log(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async leaveChannel(req: Request, res: Response): Promise<void> {
    try {
      const team = req.team.name;
      const channel = req.channel.name;
      const user = req.user._id as Types.ObjectId;
      const result = await ChannelService.leaveChannel(team, channel, user);

      res.status(200).json({
        message: 'User left channel successfully'
      });
    } catch (err) {
      if ((err as any).message === 'Channel not found') {
        res.status(404).json({ error: 'Channel not found' });
      } else if ((err as any).message === 'Team not found') {
        res.status(404).json({ error: 'Team not found' });
      } else if ((err as any).message === 'User is not a member of the team') {
        res.status(403).json({ error: 'User is not a member of the team' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async listAllChannels(req: Request, res: Response): Promise<void> {
    try {
      const role = req.user.role;
      const team = req.team._id as Types.ObjectId;
      if (role === Role.SUPER_ADMIN) {
        const channels = await ChannelService.listAllChannels(role, team, null, null);
        res.status(200).json(channels);
        return;
      }
      const teamRole = req.teamMember.role as TeamRole;
      const teamMember = req.teamMember._id as Types.ObjectId;

      const channels = await ChannelService.listAllChannels(role, team, teamRole, teamMember);
      res.status(200).json(channels);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async requestChannelAccess(req: Request, res: Response): Promise<void> {
    try {
      const team = req.team._id as Types.ObjectId;
      const user = req.user._id as Types.ObjectId;
      const channelName = req.body.channelName as string;
      const result = await ChannelService.requestChannelAccess(channelName, team, user);

      res.status(200).json({
        message: 'Request sent successfully'
      });
    } catch (err) {
      if ((err as any).message === 'Channel not found') {
        res.status(404).json({ error: 'Channel not found' });
      } else if ((err as any).message === 'Team not found') {
        res.status(404).json({ error: 'Team not found' });
      } else if ((err as any).message === 'User not found') {
        res.status(404).json({ error: 'User not found' });
      } else if ((err as any).message === 'User is not a member of the team') {
        res.status(403).json({ error: 'User is not a member of the team' });
      } else if ((err as any).message === 'User is already a member of the channel') {
        res.status(400).json({ error: 'User is already a member of the channel' });
      } else if ((err as any).message === 'Access request already sent') {
        res.status(400).json({ error: 'Access request already sent' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async getChannelAccessRequests(req: Request, res: Response): Promise<void> {
    try {
      const team = req.team._id as Types.ObjectId;
      const accessRequests = await ChannelService.getChannelAccessRequests(team);

      res.status(200).json(accessRequests);
    } catch (err) {
      if ((err as any).message === 'Team not found') {
        res.status(404).json({ error: 'Team not found' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async respondToAccessRequest(req: Request, res: Response): Promise<void> {
    try {
      const decision = req.body.decision;
      const team = req.team._id as Types.ObjectId;
      const requestId = req.body.requestId;
      console.log('requestId', requestId);
      const result = await ChannelService.respondToAccessRequest(requestId, team, decision);

      res.status(200).json({
        message: 'Request responded successfully'
      });
    } catch (err) {
      if ((err as any).message === 'Channel not found') {
        res.status(404).json({ error: 'Channel not found' });
      } else if ((err as any).message === 'Access request not found') {
        res.status(404).json({ error: 'Access request not found' });
      } else if ((err as any).message === 'Access request already processed') {
        res.status(400).json({ error: 'Access request already processed' });
      } else if ((err as any).message === 'User not found') {
        res.status(404).json({ error: 'User not found' });
      } else if ((err as any).message === 'User is not a member of the team') {
        res.status(403).json({ error: 'User is not a member of the team' });
      } else if ((err as any).message === 'User is already a member of the channel') {
        res.status(400).json({ error: 'User is already a member of the channel' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
}

export default ChannelController;

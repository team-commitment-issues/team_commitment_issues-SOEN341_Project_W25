import { Request, Response } from 'express';
import SuperAdminService from '../services/superAdminService';
import { Schema, Types } from 'mongoose';

class SuperAdminController {
  static async createTeam(req: Request, res: Response): Promise<void> {
    try {
      const teamName = req.body.teamName;
      const user = req.user._id as Types.ObjectId;
      const username = req.user.username;
      const team = await SuperAdminService.createTeam(teamName, user, username);

      res.status(201).json({
        message: 'Team created successfully',
        team
      });
    } catch (err) {
      if ((err as any).message === 'Team already exists') {
        res.status(400).json({ error: 'Team already exists' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async addUserToTeam(req: Request, res: Response): Promise<void> {
    try {
      const { username, role } = req.body;
      const team = req.team._id as Schema.Types.ObjectId;
      const teamMember = await SuperAdminService.addUserToTeam(username, team, role);

      res.status(201).json({
        message: 'User added to team successfully',
        teamMember
      });
    } catch (err) {
      if ((err as any).message === 'Team not found') {
        res.status(400).json({ error: 'Team not found' });
      } else if ((err as any).message === 'User not found') {
        res.status(400).json({ error: 'User not found' });
      } else if ((err as any).message === 'User is already a member of the team') {
        res.status(400).json({ error: 'User is already a member of the team' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async removeUserFromTeam(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.body;
      const team = req.team._id as Types.ObjectId;
      const result = await SuperAdminService.removeUserFromTeam(username, team);

      res.status(200).json({
        message: 'User removed from team successfully'
      });
    } catch (err) {
      if ((err as any).message === 'User is not a member of the team') {
        res.status(400).json({ error: 'User is not a member of the team' });
      } else if ((err as any).message === 'User not found') {
        res.status(400).json({ error: 'User not found' });
      } else if ((err as any).message === 'Team not found') {
        res.status(400).json({ error: 'Team not found' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async promoteToAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.body;
      const team = req.team._id as Types.ObjectId;
      const result = await SuperAdminService.promoteToAdmin(username, team);

      res.status(200).json({
        message: 'User promoted to admin successfully'
      });
    } catch (err) {
      if ((err as any).message === 'User is already an admin of the team') {
        res.status(400).json({ error: 'User is already an admin of the team' });
      } else if ((err as any).message === 'User not found') {
        res.status(400).json({ error: 'User not found' });
      } else if ((err as any).message === 'Team not found') {
        res.status(400).json({ error: 'Team not found' });
      } else if ((err as any).message === 'User is not a member of the team') {
        res.status(400).json({ error: 'User is not a member of the team' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async demoteToUser(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.body;
      const team = req.team._id as Types.ObjectId;
      const result = await SuperAdminService.demoteToUser(username, team);

      res.status(200).json({
        message: 'Admin demoted to user successfully'
      });
    } catch (err) {
      if ((err as any).message === 'User is not an admin of the team') {
        res.status(400).json({ error: 'User is not an admin of the team' });
      } else if ((err as any).message === 'User not found') {
        res.status(400).json({ error: 'User not found' });
      } else if ((err as any).message === 'Team not found') {
        res.status(400).json({ error: 'Team not found' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async deleteTeam(req: Request, res: Response): Promise<void> {
    try {
      const team = req.team._id as Types.ObjectId;
      const result = await SuperAdminService.deleteTeam(team);

      res.status(200).json({
        message: 'Team deleted successfully'
      });
    } catch (err) {
      if ((err as any).message === 'Team not found') {
        res.status(400).json({ error: 'Team not found' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
}

export default SuperAdminController;

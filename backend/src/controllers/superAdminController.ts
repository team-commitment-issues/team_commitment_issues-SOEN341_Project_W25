import { Request, Response } from 'express';
import SuperAdminService from '../services/superAdminService';

class SuperAdminController {
    static async createTeam(req: Request, res: Response): Promise<void> {
        try {
            const { teamName } = req.body;
            const team = await SuperAdminService.createTeam(teamName, req.user._id as string);

            res.status(201).json({
                message: 'Team created successfully',
                team,
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
            const { userID, teamID, role } = req.body;
            const teamMember = await SuperAdminService.addUserToTeam(userID, teamID, role);

            res.status(201).json({
                message: 'User added to team successfully',
                teamMember,
            });
        } catch (err) {
            if ((err as any).message === 'Team not found') {
                res.status(400).json({ error: 'Team not found' });
            } else if ((err as any).message === 'User not found') {
                res.status(400).json({ error: 'User not found' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    static async removeUserFromTeam(req: Request, res: Response): Promise<void> {
        try {
            const { userID, teamID } = req.body;
            const result = await SuperAdminService.removeUserFromTeam(userID, teamID);

            res.status(200).json(result);
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

    static async deleteTeam(req: Request, res: Response): Promise<void> {
        try {
            const { teamID } = req.body;
            const result = await SuperAdminService.deleteTeam(teamID);

            res.status(200).json(result);
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
import { Request, Response } from 'express';
import SuperAdminService from '../services/superAdminService';

class SuperAdminController {
    static async createTeam(req: Request, res: Response): Promise<void> {
        try {
            const { name, createdByUserID } = req.body;
            const team = await SuperAdminService.createTeam(name, createdByUserID);

            res.status(201).json({
                message: 'Team created successfully',
                team,
            });
        } catch (err) {
            res.status(500).json({ error: 'Internal server error' });
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
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

export default SuperAdminController;
import { Request, Response } from 'express';
import DashboardSerivce from '../services/dashboardService';

class DashboardController {
    static async listTeams(req: Request, res: Response): Promise<void> {
        try {
            const teams = await DashboardSerivce.listTeams(req.user.userID);
            res.status(200).json(teams);
        } catch (error) {
            res.status(500).json({ 'Internal Server Error': (error as Error).message });
        }
    }

    static async listChannels(req: Request, res: Response): Promise<void> {
        try {
            const userID = req.user.userID;

            const channels = await DashboardSerivce.listChannels(userID, req.body.team);
            res.status(200).json(channels);
        } catch (error) {
            console.log(error);
            if ((error as any).message === 'User not found') {
                res.status(404).json({ error: 'User not found' });
            } else if ((error as any).message === 'Team not found') {
                res.status(404).json({ error: 'Team not found' });
            } else if ((error as any).message === 'User is not a member of the specified team') {
                res.status(403).json({ error: 'User is not a member of the specified team' });
            } else {
                res.status(500).json({ error: (error as Error).message });
            }
        }
    }
}

export default DashboardController;

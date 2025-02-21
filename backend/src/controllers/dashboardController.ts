import { Request, Response } from 'express';
import DashboardSerivce from '../services/dashboardService';
import { Types } from 'mongoose';

class DashboardController {
    static async listTeams(req: Request, res: Response): Promise<void> {
        try {
            const role = req.user.role;
            const teamMemberships = req.user.teamMemberships;
            const teams = await DashboardSerivce.listTeams(role, teamMemberships);
            res.status(200).json(teams);
        } catch (error) {
            res.status(500).json({ 'Internal Server Error': (error as Error).message });
        }
    }

    static async listChannels(req: Request, res: Response): Promise<void> {
        try {
            const role = req.user.role;
            const team = req.team._id as Types.ObjectId;
            const teamMember = req.teamMember._id as Types.ObjectId;

            const channels = await DashboardSerivce.listChannels(role, team, teamMember);
            res.status(200).json(channels);
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    static async listUsers(req: Request, res: Response): Promise<void> {
        try {
            const username = req.user.username;
            const users = await DashboardSerivce.listUsers(username);
            res.status(200).json(users);
        } catch (error) {
            res.status(500).json({ 'Internal Server Error': (error as Error).message });
        }
    }

    static async listTeamUsers(req: Request, res: Response): Promise<void> {
        try {
            const team = req.team._id as Types.ObjectId;
            const users = await DashboardSerivce.listTeamUsers(team);
            res.status(200).json(users);
        } catch (error) {
            res.status(500).json({ 'Internal Server Error': (error as Error).message });
        }
    }

    static async listChannelUsers(req: Request, res: Response): Promise<void> {
        try {
            const channel = req.channel._id as Types.ObjectId;
            const users = await DashboardSerivce.listChannelUsers(channel);
            res.status(200).json(users);
        } catch (error) {
            res.status(500).json({ 'Internal Server Error': (error as Error).message });
        }
    }
}

export default DashboardController;

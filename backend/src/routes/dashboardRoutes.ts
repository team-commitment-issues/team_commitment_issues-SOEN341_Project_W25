import { Router } from 'express';
import DashboardController from '../controllers/dashboardController';
import checkPermission from '../middlewares/permissionMiddleware';
import authenticate from '../middlewares/authMiddleware';
import { TeamRole } from '../enums';

const dashboardRoutes = Router();

dashboardRoutes.get('/listTeams', authenticate, DashboardController.listTeams);
dashboardRoutes.get('/listChannels', authenticate, checkPermission(TeamRole.MEMBER), DashboardController.listChannels);

export default dashboardRoutes;

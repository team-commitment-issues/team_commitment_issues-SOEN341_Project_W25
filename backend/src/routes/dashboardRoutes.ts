import { Router } from 'express';
import DashboardController from '../controllers/dashboardController';
import { checkChannelPermission, checkTeamPermission, checkUserPermission } from '../middlewares/permissionMiddleware';
import authenticate from '../middlewares/authMiddleware';
import { Role, TeamRole } from '../enums';
import rateLimit from 'express-rate-limit';

const dashboardRoutes = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
});

dashboardRoutes.use(limiter);

dashboardRoutes.get('/listTeams', authenticate, DashboardController.listTeams);
dashboardRoutes.get('/listChannels', authenticate, checkTeamPermission(TeamRole.MEMBER), DashboardController.listChannels);
dashboardRoutes.get('/listUsers', authenticate, checkUserPermission(Role.SUPER_ADMIN), DashboardController.listUsers);
dashboardRoutes.get('/listUsersInTeam', authenticate, checkTeamPermission(TeamRole.MEMBER), DashboardController.listTeamUsers);
dashboardRoutes.get('/listUsersInChannel', authenticate, checkTeamPermission(TeamRole.MEMBER), checkChannelPermission(), DashboardController.listChannelUsers);

export default dashboardRoutes;

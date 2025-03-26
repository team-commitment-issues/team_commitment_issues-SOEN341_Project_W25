import { Router } from 'express';
import DashboardController from '../controllers/dashboardController';
import {
  checkChannelPermission,
  checkTeamPermission,
  checkUserPermission
} from '../middlewares/permissionMiddleware';
import authenticate from '../middlewares/authMiddleware';
import { Role, TeamRole } from '../enums';

const dashboardRoutes = Router();

dashboardRoutes.get('/listTeams', authenticate, DashboardController.listTeams);
dashboardRoutes.post(
  '/listChannels',
  authenticate,
  checkTeamPermission(TeamRole.MEMBER),
  DashboardController.listChannels
);
dashboardRoutes.get(
  '/listUsers',
  authenticate,
  checkUserPermission(Role.SUPER_ADMIN),
  DashboardController.listUsers
);
dashboardRoutes.post(
  '/listUsersInTeam',
  authenticate,
  checkTeamPermission(TeamRole.MEMBER),
  DashboardController.listTeamUsers
);
dashboardRoutes.post(
  '/listUsersInChannel',
  authenticate,
  checkTeamPermission(TeamRole.MEMBER),
  checkChannelPermission(),
  DashboardController.listChannelUsers
);

export default dashboardRoutes;

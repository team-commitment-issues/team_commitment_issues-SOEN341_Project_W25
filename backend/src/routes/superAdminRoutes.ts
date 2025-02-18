import { Router } from 'express';
import authenticate from '../middlewares/authMiddleware';
import { Role, TeamRole } from '../enums';
import SuperAdminController from '../controllers/superAdminController';
import { checkTeamPermission, checkUserPermission } from '../middlewares/permissionMiddleware';

const superAdminRoutes = Router();

superAdminRoutes.post('/createTeam', authenticate, checkUserPermission(Role.SUPER_ADMIN), SuperAdminController.createTeam);
superAdminRoutes.post('/addUserToTeam', authenticate, checkUserPermission(Role.SUPER_ADMIN), checkTeamPermission(TeamRole.ADMIN), SuperAdminController.addUserToTeam);
superAdminRoutes.post('/removeUserFromTeam', authenticate, checkUserPermission(Role.SUPER_ADMIN), checkTeamPermission(TeamRole.ADMIN), SuperAdminController.removeUserFromTeam);
superAdminRoutes.post('/deleteTeam', authenticate, checkUserPermission(Role.SUPER_ADMIN), checkTeamPermission(TeamRole.ADMIN), SuperAdminController.deleteTeam);

export default superAdminRoutes;
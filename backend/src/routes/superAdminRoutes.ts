import { Router } from 'express';
import authenticate from '../middlewares/authMiddleware';
import { Permission } from '../enums';
import SuperAdminController from '../controllers/superAdminController';
import checkPermission from '../middlewares/permissionMiddleware';

const superAdminRoutes = Router();

superAdminRoutes.post('/createTeam', authenticate, checkPermission(Permission.ManageTeam), SuperAdminController.createTeam);
superAdminRoutes.post('/addUserToTeam', authenticate, checkPermission(Permission.ManageTeam), SuperAdminController.addUserToTeam);

export default superAdminRoutes;
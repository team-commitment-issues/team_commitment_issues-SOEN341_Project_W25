import { Router } from 'express';
import authenticate from '../middlewares/authMiddleware';
import { Role } from '../enums';
import SuperAdminController from '../controllers/superAdminController';
import checkPermission from '../middlewares/permissionMiddleware';

const superAdminRoutes = Router();

superAdminRoutes.post('/createTeam', authenticate, checkPermission(Role.SUPER_ADMIN), SuperAdminController.createTeam);
superAdminRoutes.post('/addUserToTeam', authenticate, checkPermission(Role.SUPER_ADMIN), SuperAdminController.addUserToTeam);

export default superAdminRoutes;
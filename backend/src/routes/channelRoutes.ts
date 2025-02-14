import { Router } from 'express';
import checkPermission from '../middlewares/permissionMiddleware';
import authenticate from '../middlewares/authMiddleware';
import ChannelController from '../controllers/channelController';
import { TeamRole } from '../enums';


const channelRoutes = Router();

channelRoutes.post('/createChannel', authenticate, checkPermission(TeamRole.ADMIN), ChannelController.createChannel);
channelRoutes.post('/addUserToChannel', authenticate, checkPermission(TeamRole.ADMIN), ChannelController.addUserToChannel);

export default channelRoutes;
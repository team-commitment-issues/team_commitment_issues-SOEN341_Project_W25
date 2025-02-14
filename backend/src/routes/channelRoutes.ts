import { Router } from 'express';
import checkPermission from '../middlewares/permissionMiddleware';
import authenticate from '../middlewares/authMiddleware';
import ChannelController from '../controllers/channelController';
import { TeamRole } from '../enums';


const channelRoutes = Router();

channelRoutes.post('/channels', authenticate, checkPermission(TeamRole.ADMIN), ChannelController.createChannel);

export default channelRoutes;
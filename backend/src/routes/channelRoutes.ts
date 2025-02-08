import { Router } from 'express';
import checkPermission from '../middlewares/permissionMiddleware';
import authenticate from '../middlewares/authMiddleware';
import { Permission } from '../enums';
import ChannelController from '../controllers/channelController';


const channelRoutes = Router();

channelRoutes.post('/channels', authenticate, checkPermission(Permission.ManageChannel), ChannelController.createChannel);

export default channelRoutes;
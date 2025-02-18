import { Router } from 'express';
import checkPermission from '../middlewares/permissionMiddleware';
import authenticate from '../middlewares/authMiddleware';
import ChannelController from '../controllers/channelController';
import { TeamRole } from '../enums';


const channelRoutes = Router();

channelRoutes.post('/createChannel', authenticate, checkPermission(TeamRole.ADMIN), ChannelController.createChannel);
channelRoutes.post('/addUserToChannel', authenticate, checkPermission(TeamRole.ADMIN), ChannelController.addUserToChannel);
channelRoutes.post('/sendMessage', authenticate, checkPermission(TeamRole.MEMBER), ChannelController.sendMessage);
channelRoutes.post('/deleteChannel', authenticate, checkPermission(TeamRole.ADMIN), ChannelController.deleteChannel);
channelRoutes.get('/getMessages', authenticate, checkPermission(TeamRole.MEMBER), ChannelController.getMessages);

export default channelRoutes;
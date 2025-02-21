import { Router } from 'express';
import { checkTeamPermission, checkChannelPermission } from '../middlewares/permissionMiddleware';
import authenticate from '../middlewares/authMiddleware';
import ChannelController from '../controllers/channelController';
import { TeamRole } from '../enums';


const channelRoutes = Router();

channelRoutes.post('/createChannel', authenticate, checkTeamPermission(TeamRole.ADMIN), ChannelController.createChannel);
channelRoutes.post('/addUserToChannel', authenticate, checkTeamPermission(TeamRole.ADMIN), checkChannelPermission(), ChannelController.addUserToChannel);
channelRoutes.post('/sendMessage', authenticate, checkTeamPermission(TeamRole.MEMBER), checkChannelPermission(), ChannelController.sendMessage);
channelRoutes.post('/deleteChannel', authenticate, checkTeamPermission(TeamRole.ADMIN), checkChannelPermission(), ChannelController.deleteChannel);
channelRoutes.get('/getMessages', authenticate, checkTeamPermission(TeamRole.MEMBER), checkChannelPermission(), ChannelController.getMessages);

export default channelRoutes;
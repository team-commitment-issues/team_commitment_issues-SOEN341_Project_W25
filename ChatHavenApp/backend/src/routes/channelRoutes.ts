import { Router } from 'express';
import { checkTeamPermission, checkChannelPermission } from '../middlewares/permissionMiddleware';
import authenticate from '../middlewares/authMiddleware';
import ChannelController from '../controllers/channelController';
import { TeamRole } from '../enums';

const channelRoutes = Router();

channelRoutes.post(
  '/createChannel',
  authenticate,
  checkTeamPermission(TeamRole.MEMBER),
  ChannelController.createChannel
);
channelRoutes.post(
  '/addUserToChannel',
  authenticate,
  checkTeamPermission(TeamRole.ADMIN),
  checkChannelPermission(),
  ChannelController.addUserToChannel
);
channelRoutes.post(
  '/removeUserFromChannel',
  authenticate,
  checkTeamPermission(TeamRole.ADMIN),
  checkChannelPermission(),
  ChannelController.removeUserFromChannel
);
channelRoutes.post(
  '/deleteChannel',
  authenticate,
  checkTeamPermission(TeamRole.ADMIN),
  checkChannelPermission(),
  ChannelController.deleteChannel
);
channelRoutes.post(
  '/getMessages',
  authenticate,
  checkTeamPermission(TeamRole.MEMBER),
  checkChannelPermission(),
  ChannelController.getMessages
);
channelRoutes.post(
  '/deleteMessage',
  authenticate,
  checkTeamPermission(TeamRole.ADMIN),
  checkChannelPermission(),
  ChannelController.deleteMessage
);
channelRoutes.post(
  '/leaveChannel',
  authenticate,
  checkTeamPermission(TeamRole.MEMBER),
  checkChannelPermission(),
  ChannelController.leaveChannel
);
channelRoutes.post(
  '/getAllChannels',
  authenticate,
  checkTeamPermission(TeamRole.MEMBER),
  ChannelController.listAllChannels
);
channelRoutes.post(
  '/requestAccess',
  authenticate,
  checkTeamPermission(TeamRole.MEMBER),
  checkChannelPermission(),
  ChannelController.requestChannelAccess
);
channelRoutes.post(
  '/getAccessRequests',
  authenticate,
  checkTeamPermission(TeamRole.ADMIN),
  ChannelController.getChannelAccessRequests
);
channelRoutes.post(
  '/respondToAccessRequest',
  authenticate,
  checkTeamPermission(TeamRole.ADMIN),
  ChannelController.respondToAccessRequest
);

export default channelRoutes;

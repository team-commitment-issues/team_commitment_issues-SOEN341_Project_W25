import { Router } from 'express';
import OnlineStatusController from '../controllers/onlineStatusController';
import authenticate from '../middlewares/authMiddleware';

const onlineStatusRoutes = Router();

onlineStatusRoutes.post('/online-status', authenticate, OnlineStatusController.getUserOnlineStatus);
onlineStatusRoutes.post('/set-status', authenticate, OnlineStatusController.setUserStatus);

export default onlineStatusRoutes;

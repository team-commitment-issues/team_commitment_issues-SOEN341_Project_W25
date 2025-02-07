import express from 'express';
import ChannelController from '../controllers/channelController';

const router = express.Router();

router.post('/create', ChannelController.createChannel);
router.post('/addUser', ChannelController.addUserToChannel);
router.get('/userChannels', ChannelController.getUserChannels);

export default router;

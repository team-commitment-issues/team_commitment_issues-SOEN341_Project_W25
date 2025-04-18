import { Router } from 'express';
import UserController from '../controllers/userController';
import authenticate from '../middlewares/authMiddleware';

const userRoutes = Router();

userRoutes.post('/login', UserController.login);
userRoutes.post('/signUp', UserController.signUp);
userRoutes.post('/update-username', authenticate, UserController.updateUsername);
userRoutes.post('/update-password', authenticate, UserController.updatePassword);
userRoutes.post('/set-preferred-language', authenticate, UserController.setPreferredLanguage);
userRoutes.get('/profile', authenticate, UserController.getUserProfile);

export default userRoutes;

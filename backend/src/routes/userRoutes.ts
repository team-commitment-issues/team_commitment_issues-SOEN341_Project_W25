import { Router } from 'express';
import UserController from '../controllers/userController';

const userRoutes = Router();

userRoutes.post('/register', UserController.register);

export default userRoutes;
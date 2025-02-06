import { Request, Response } from 'express';
import UserService from '../services/userService';

class UserController {
    static async signUp(req: Request, res: Response): Promise<void> {
        try {
            const { email, password, firstName, lastName, userID } = req.body;
            const newUser = await UserService.createUser(email, password, firstName, lastName, userID);

            const userResponse = {
                username: newUser.username,
                email: newUser.email,
                password: newUser.password,
            };

            res.status(201).json({
                message: 'User registered successfully',
                user: userResponse,
            })
        } catch (err) {
            if ((err as any).code === 11000) {
                const field = Object.keys((err as any).keyValue)[0];
                if (field === 'username') {
                    res.status(400).json({error: 'Username already exists'});
                } else if (field === 'email') {
                    res.status(400).json({error: 'Email already exists'});
                } else {
                    res.status(500).json({error: 'An error occurred'});
                }
            } else {
                res.status(500).json({error: 'An error occurred'});
            }
        }
    }

    static async login(req: Request, res: Response): Promise<void> {
        try {
            const { userID, password } = req.body;
            const token = await UserService.userAuth(userID, password);

            res.status(200).json({
                message: 'User logged in successfully',
                token,
            });
            
        } catch (err) {
            res.status(500).json({error: 'An error occurred'});
        }
    }
}

export default UserController;
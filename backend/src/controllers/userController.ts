import { Request, Response } from 'express';
import UserService from '../services/userService';

class UserController {
    static async register(req: Request, res: Response) {
        try {
            const newUser = await UserService.createUser(req.body);
            res.status(201).send('User registered successfully');
        } catch (err) {
            if ((err as any).code === 11000) {
                const field = Object.keys((err as any).keyValue)[0];
                if (field === 'username') {
                    res.status(400).send('Username already exists');
                } else if (field === 'email') {
                    res.status(400).send('Email already exists');
                } else {
                    res.status(500).send('An error occurred');
                }
            } else {
                res.status(500).send('An error occurred');
            }
        }
    }
}

export default UserController;
import { Request, Response } from 'express';
import UserService from '../services/userService';
import { Role } from '../enums';

class UserController {
    static async signUp(req: Request, res: Response): Promise<void> {
        try {
            const { email, password, firstName, lastName, userID } = req.body;
            const newUser = await UserService.createUser(email, password, firstName, lastName, userID, Role.USER);

            const userResponse = {
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                userID: newUser.userID,
            };

            res.status(201).json({
                message: 'User registered successfully',
                user: userResponse,
            });
        } catch (err) {
            if ((err as any).message === 'Email already exists') {
                res.status(400).json({ error: 'Email already exists' });
            } else if ((err as any).message === 'UserID already exists') {
                res.status(400).json({ error: 'UserID already exists' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    static async login(req: Request, res: Response): Promise<void> {
        try {
            const { userID, password } = req.body;
            const token = await UserService.userAuth(userID, password);
            
            res.status(200).json({ message: 'User logged in successfully', token });
        } catch (err) {
            if ((err as any).message === 'User not found') {
                res.status(404).json({ error: 'User not found' });
            } else if ((err as any).message === 'Incorrect password') {
                res.status(400).json({ error: 'Incorrect password' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }
}

export default UserController;

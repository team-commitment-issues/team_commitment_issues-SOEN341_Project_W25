import { Request, Response } from 'express';
import UserService from '../services/userService';

class UserController {
   //For handling user signup
    static async signUp(req: Request, res: Response): Promise<void> {
        try {
            const { email, password, firstName, lastName, userID } = req.body;
            const newUser = await UserService.createUser(email, password, firstName, lastName, userID);

            // Response with user details (excluding password)
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
            if ((err as any).code === 11000) { // Handle duplicate email or userID
                const field = Object.keys((err as any).keyValue)[0];
                res.status(400).json({ error: `${field} already exists` });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    //for handling user login
    static async login(req: Request, res: Response): Promise<void> {
        try {
            const { userID, password } = req.body;
            const isAuthenticated = await UserService.userAuth(userID, password);

            if (isAuthenticated) {
                res.status(200).json({ message: 'User logged in successfully' });
            }
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

export default UserController;

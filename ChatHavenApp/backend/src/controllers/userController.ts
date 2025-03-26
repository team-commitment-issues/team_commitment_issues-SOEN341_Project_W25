import { Request, Response } from 'express';
import UserService from '../services/userService';
import { Role } from '../enums';
import jwt from 'jsonwebtoken';

class UserController {
  static async signUp(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName, username } = req.body;
      const newUser = await UserService.createUser(
        email,
        password,
        firstName,
        lastName,
        username,
        Role.USER
      );

      const userResponse = {
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        username: newUser.username
      };

      res.status(201).json({
        message: 'User registered successfully',
        user: userResponse
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
      const { username, password } = req.body;
      const token = await UserService.userAuth(username, password);

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

  static async updateUsername(req: Request, res: Response): Promise<void> {
    try {
      const { oldUsername, newUsername, password } = req.body;

      const updatedUser = await UserService.updateUsername(oldUsername, newUsername, password);

      try {
        const token = jwt.sign(
          {
            username: newUsername,
            email: updatedUser.email
          },
          process.env.JWT_SECRET!,
          { expiresIn: '1h' }
        );

        res.status(200).json({
          message: 'Username updated successfully',
          token: token
        });
      } catch (err) {
        res.status(500).json({ error: 'Error generating new token' });
      }
    } catch (err) {
      if ((err as any).message === 'User not found') {
        res.status(404).json({ error: 'User not found' });
      } else if ((err as any).message === 'Incorrect password') {
        res.status(400).json({ error: 'Incorrect password' });
      } else if ((err as any).message === 'Username already exists') {
        res.status(400).json({ error: 'Username already exists' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  static async updatePassword(req: Request, res: Response): Promise<void> {
    try {
      const { oldPassword, newPassword } = req.body;

      await UserService.updatePassword(req.user.username, oldPassword, newPassword);

      res.status(200).json({ message: 'Password updated successfully' });
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

  static async getUserProfile(req: Request, res: Response): Promise<void> {
    try {
      // Get the username from the authenticated user object
      const username = req.user.username;

      // Fetch the user profile
      const userProfile = await UserService.getUserProfile(username);

      // Return the user profile data
      res.status(200).json({
        message: 'User profile retrieved successfully',
        user: {
          email: userProfile.email,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          username: userProfile.username,
          role: userProfile.role
        }
      });
    } catch (err) {
      if ((err as any).message === 'User not found') {
        res.status(404).json({ error: 'User not found' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
        console.error('Error fetching user profile:', err);
      }
    }
  }
}

export default UserController;

import request from 'supertest';
import express from 'express';
import superAdminRoutes from '../routes/superAdminRoutes';
import authenticate from '../middlewares/authMiddleware';
import checkPermission from '../middlewares/permissionMiddleware';
import { Role } from '../enums';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Team from '../models/Team';

const app = express();
app.use(express.json());
app.use('/superadmin', authenticate, checkPermission(Role.SUPER_ADMIN), superAdminRoutes);

describe('POST /superadmin/createTeam', () => {
    it('should create a new team successfully', async () => {
        const superAdminUser = new User({
            email: 'superadmin@user.com',
            password: 'testpassword',
            firstName: 'Super',
            lastName: 'Admin',
            userID: 'superadminuser',
            role: 'SUPER_ADMIN',
        }) as mongoose.Document & { _id: mongoose.Types.ObjectId, userID: string, email: string };
        await superAdminUser.save();

        const token = jwt.sign({ userID: superAdminUser.userID, email: superAdminUser.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });

        const newTeam = {
            teamName: 'Test Team',
        };

        const response = await request(app)
            .post('/superadmin/createTeam')
            .set('Authorization', `Bearer ${token}`)
            .send(newTeam)
            .expect(201);

        expect(response.body.message).toBe('Team created successfully');
        expect(response.body.team.name).toBe(newTeam.teamName);
    });

    it('should return an error if the team already exists', async () => {
        const superAdminUser = new User({
            email: 'superadmin@user.com',
            password: 'testpassword',
            firstName: 'Super',
            lastName: 'Admin',
            userID: 'superadminuser',
            role: 'SUPER_ADMIN',
        });
        await superAdminUser.save();

        const team = new Team({
            name: 'Existing Team',
            createdBy: superAdminUser._id,
        }) as mongoose.Document & { _id: mongoose.Types.ObjectId };
        await team.save();

        const token = jwt.sign({ userID: superAdminUser.userID, email: superAdminUser.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });

        const newTeam = {
            teamName: 'Existing Team',
        };

        const response = await request(app)
            .post('/superadmin/createTeam')
            .set('Authorization', `Bearer ${token}`)
            .send(newTeam)
            .expect(400);

        expect(response.body.error).toBe('Team already exists');
    });

    it('should return an error if the user is not authorized', async () => {
        const newTeam = {
            teamName: 'Unauthorized Team',
        };

        const response = await request(app)
            .post('/superadmin/createTeam')
            .send(newTeam)
            .expect(401);

        expect(response.body.error).toBe('Unauthorized: No token provided');
    });
});

describe('POST /superadmin/addUserToTeam', () => {
    it('should add a user to a team successfully', async () => {
        const superAdminUser = new User({
            email: 'superadmin@user.com',
            password: 'testpassword',
            firstName: 'Super',
            lastName: 'Admin',
            userID: 'superadminuser',
            role: 'SUPER_ADMIN',
        });
        await superAdminUser.save();

        const user = new User({
            email: 'user@user.com',
            password: 'testpassword',
            firstName: 'User',
            lastName: 'User',
            userID: 'useruser',
            role: 'USER',
        });
        await user.save();

        const team = new Team({
            name: 'Test Team',
            createdBy: superAdminUser._id,
        }) as mongoose.Document & { _id: mongoose.Types.ObjectId };
        await team.save();

        const token = jwt.sign({ userID: superAdminUser.userID, email: superAdminUser.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });

        const addUserRequest = {
            userID: (user as any)._id.toString(),
            teamID: team._id.toString(),
            role: 'MEMBER',
        };

        const response = await request(app)
            .post('/superadmin/addUserToTeam')
            .set('Authorization', `Bearer ${token}`)
            .send(addUserRequest)
            .expect(201);

        expect(response.body.message).toBe('User added to team successfully');
        expect(response.body.teamMember.user).toBe(addUserRequest.userID);
        expect(response.body.teamMember.team).toBe(addUserRequest.teamID);
    });

    it('should return an error if the team is not found', async () => {
        const superAdminUser = new User({
            email: 'superadmin@user.com',
            password: 'testpassword',
            firstName: 'Super',
            lastName: 'Admin',
            userID: 'superadminuser',
            role: 'SUPER_ADMIN',
        });
        await superAdminUser.save();

        const user = new User({
            email: 'user@user.com',
            password: 'testpassword',
            firstName: 'User',
            lastName: 'User',
            userID: 'useruser',
            role: 'USER',
        });
        await user.save();

        const token = jwt.sign({ userID: superAdminUser.userID, email: superAdminUser.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });

        const addUserRequest = {
            userID: (user as mongoose.Document & { _id: mongoose.Types.ObjectId })._id.toString(),
            teamID: new mongoose.Types.ObjectId().toString(),
            role: 'MEMBER',
        };

        const response = await request(app)
            .post('/superadmin/addUserToTeam')
            .set('Authorization', `Bearer ${token}`)
            .send(addUserRequest)
            .expect(400);

        expect(response.body.error).toBe('Team not found');
    });

    it('should return an error if the user is not found', async () => {
        const superAdminUser = new User({
            email: 'superadmin@user.com',
            password: 'testpassword',
            firstName: 'Super',
            lastName: 'Admin',
            userID: 'superadminuser',
            role: 'SUPER_ADMIN',
        });
        await superAdminUser.save();

        const team = new Team({
            name: 'Test Team',
            createdBy: superAdminUser._id,
        }) as mongoose.Document & { _id: mongoose.Types.ObjectId };
        await team.save();

        const token = jwt.sign({ userID: superAdminUser.userID, email: superAdminUser.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });

        const addUserRequest = {
            userID: new mongoose.Types.ObjectId().toString(),
            teamID: team._id.toString(),
            role: 'MEMBER',
        };

        const response = await request(app)
            .post('/superadmin/addUserToTeam')
            .set('Authorization', `Bearer ${token}`)
            .send(addUserRequest)
            .expect(400);

        expect(response.body.error).toBe('User not found');
    });

    it('should return an error if the user is not authorized', async () => {
        const addUserRequest = {
            userID: new mongoose.Types.ObjectId().toString(),
            teamID: new mongoose.Types.ObjectId().toString(),
            role: 'MEMBER',
        };

        const response = await request(app)
            .post('/superadmin/addUserToTeam')
            .send(addUserRequest)
            .expect(401);

        expect(response.body.error).toBe('Unauthorized: No token provided');
    });
});
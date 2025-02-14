import request from 'supertest';
import express from 'express';
import channelRoutes from '../routes/channelRoutes';
import authenticate from '../middlewares/authMiddleware';
import checkPermission from '../middlewares/permissionMiddleware';
import { TeamRole } from '../enums';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Team from '../models/Team';
import Channel from '../models/Channel';
import TeamMember from '../models/TeamMember';

const app = express();
app.use(express.json());
app.use('/channel', authenticate, checkPermission(TeamRole.ADMIN), channelRoutes);

describe('POST /channel/createChannel', () => {
    it('should create a new channel successfully', async () => {
        const user = new User({
            email: 'admin@user.com',
            password: 'testpassword',
            firstName: 'Admin',
            lastName: 'User',
            userID: 'adminuser',
            role: 'SUPER_ADMIN',
        });
        await user.save();

        const team = new Team({
            name: 'Test Team',
            createdBy: user._id,
            teamMembers: [user._id],
        });
        await team.save();

        const token = jwt.sign({ userID: user.userID, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });

        const newChannel = {
            name: 'Test Channel',
            team: (team._id as Types.ObjectId).toString(),
        };

        const response = await request(app)
            .post('/channel/createChannel')
            .set('Authorization', `Bearer ${token}`)
            .send(newChannel)
            .expect(201);

        expect(response.body.message).toBe('Channel created successfully');
        expect(response.body.channel.name).toBe(newChannel.name);
    });

    it('should return an error if the user is not authorized', async () => {
        const newChannel = {
            name: 'Test Channel',
            team: new mongoose.Types.ObjectId().toString(),
        };

        const response = await request(app)
            .post('/channel/createChannel')
            .send(newChannel)
            .expect(401);

        expect(response.body.error).toBe('Unauthorized: No token provided');
    });

    it('should return an error if the team is not found', async () => {
        const user = new User({
            email: 'admin@user.com',
            password: 'testpassword',
            firstName: 'Admin',
            lastName: 'User',
            userID: 'adminuser',
            role: 'SUPER_ADMIN',
        });
        await user.save();

        const token = jwt.sign({ userID: user.userID, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });

        const newChannel = {
            name: 'Test Channel',
            team: new mongoose.Types.ObjectId().toString(),
        };

        const response = await request(app)
            .post('/channel/createChannel')
            .set('Authorization', `Bearer ${token}`)
            .send(newChannel)
            .expect(400);

        expect(response.body.error).toBe('Team is required');
    });
});

describe('POST /channel/addUserToChannel', () => {
    it('should add a user to a channel successfully', async () => {
        const adminUser = new User({
            email: 'admin@user.com',
            password: 'testpassword',
            firstName: 'Admin',
            lastName: 'User',
            userID: 'adminuser',
            role: 'SUPER_ADMIN',
        });
        await adminUser.save();

        const team = new Team({
            name: 'Test Team',
            createdBy: adminUser._id,
            teamMembers: [adminUser._id],
        });
        await team.save();

        const channel = new Channel({
            name: 'Test Channel',
            createdBy: adminUser._id,
            team: team._id,
            members: [adminUser._id],
        });
        await channel.save();

        const user = new User({
            email: 'user@user.com',
            password: 'testpassword',
            firstName: 'User',
            lastName: 'User',
            userID: 'useruser',
            role: 'USER',
        });
        await user.save();

        const teamMember = new TeamMember({
            user: user._id,
            team: team._id,
            role: TeamRole.MEMBER,
            channels: [],
        });
        await teamMember.save();

        const token = jwt.sign({ userID: adminUser.userID, email: adminUser.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });

        const addUserRequest = {
            channelID: (channel._id as Types.ObjectId).toString(),
            userID: user.userID,
        };

        const response = await request(app)
            .post('/channel/addUserToChannel')
            .set('Authorization', `Bearer ${token}`)
            .send(addUserRequest)
            .expect(201);

        expect(response.body.message).toBe('User added to channel successfully');
        expect(response.body.channel.members).toContain((user._id as Types.ObjectId).toString());
    });

    it('should return an error if the user is not authorized', async () => {
        const addUserRequest = {
            channelID: new mongoose.Types.ObjectId().toString(),
            userID: 'nonexistentuser',
        };

        const response = await request(app)
            .post('/channel/addUserToChannel')
            .send(addUserRequest)
            .expect(401);

        expect(response.body.error).toBe('Unauthorized: No token provided');
    });

    it('should return an error if the channel is not found', async () => {
        const adminUser = new User({
            email: 'admin@user.com',
            password: 'testpassword',
            firstName: 'Admin',
            lastName: 'User',
            userID: 'adminuser',
            role: 'SUPER_ADMIN',
        });
        await adminUser.save();

        const token = jwt.sign({ userID: adminUser.userID, email: adminUser.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });

        const addUserRequest = {
            channelID: new mongoose.Types.ObjectId().toString(),
            userID: 'nonexistentuser',
        };

        const response = await request(app)
            .post('/channel/addUserToChannel')
            .set('Authorization', `Bearer ${token}`)
            .send(addUserRequest)
            .expect(404);

        expect(response.body.error).toBe('Channel not found');
    });

    it('should return an error if the user is not found', async () => {
        const adminUser = new User({
            email: 'admin@user.com',
            password: 'testpassword',
            firstName: 'Admin',
            lastName: 'User',
            userID: 'adminuser',
            role: 'SUPER_ADMIN',
        });
        await adminUser.save();

        const team = new Team({
            name: 'Test Team',
            createdBy: adminUser._id,
            teamMembers: [adminUser._id],
        });
        await team.save();

        const channel = new Channel({
            name: 'Test Channel',
            createdBy: adminUser._id,
            team: team._id,
            members: [adminUser._id],
        });
        await channel.save();

        const token = jwt.sign({ userID: adminUser.userID, email: adminUser.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });

        const addUserRequest = {
            channelID: (channel._id as Types.ObjectId).toString(),
            userID: 'nonexistentuser',
        };

        const response = await request(app)
            .post('/channel/addUserToChannel')
            .set('Authorization', `Bearer ${token}`)
            .send(addUserRequest)
            .expect(404);

        expect(response.body.error).toBe('User not found');
    });
});
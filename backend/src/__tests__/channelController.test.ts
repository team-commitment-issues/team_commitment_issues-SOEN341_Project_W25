import request from 'supertest';
import express from 'express';
import channelRoutes from '../routes/channelRoutes';
import authenticate from '../middlewares/authMiddleware';
import checkPermission from '../middlewares/permissionMiddleware';
import { Role, TeamRole } from '../enums';
import mongoose from 'mongoose';
import TestHelpers from './testHelpers';

const app = express();
app.use(express.json());
app.use('/channel', authenticate, checkPermission(TeamRole.ADMIN), channelRoutes);

describe('POST /channel/createChannel', () => {
    it('should create a new channel successfully', async () => {
        const user = await TestHelpers.createTestSuperAdmin([]);

        const team = await TestHelpers.createTestTeam('Test Team', user._id, [], []);

        const token = await TestHelpers.generateToken(user.userID, user.email);

        const newChannel = {
            name: 'Test Channel',
            team: team.name,
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
        const user = await TestHelpers.createTestSuperAdmin([]);

        const token = await TestHelpers.generateToken(user.userID, user.email);

        const newChannel = {
            name: 'Test Channel',
            team: 'Nonexistent Team',
        };

        const response = await request(app)
            .post('/channel/createChannel')
            .set('Authorization', `Bearer ${token}`)
            .send(newChannel)
            .expect(400);

        expect(response.body.error).toBe('Team not found');
    });
});

describe('POST /channel/addUserToChannel', () => {
    it('should add a user to a channel successfully', async () => {
        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const token = await TestHelpers.generateToken(superAdminUser.userID, superAdminUser.email);

        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const team = await TestHelpers.createTestTeam('Test Team', superAdminUser._id, [], []);

        const teamMember = await TestHelpers.createTestTeamMember(user._id, team._id, TeamRole.MEMBER, []);

        team.teamMembers.push(teamMember._id);
        await team.save();

        user.teamMemberships.push(teamMember._id);
        await user.save();

        const channel = await TestHelpers.createTestChannel('Test Channel', team._id, superAdminUser._id, [teamMember._id]);

        team.channels.push(channel._id);
        await team.save();

        const addUserRequest = {
            channelName: channel.name,
            userID: user.userID,
        };

        const response = await request(app)
            .post('/channel/addUserToChannel')
            .set('Authorization', `Bearer ${token}`)
            .send(addUserRequest)
            .expect(201);

        expect(response.body.message).toBe('User added to channel successfully');
        expect(response.body.channel.members).toContain((user._id).toString());
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
        const adminUser = await TestHelpers.createTestSuperAdmin([]);

        const token = await TestHelpers.generateToken(adminUser.userID, adminUser.email);

        const addUserRequest = {
            channelName: 'Nonexistent Channel',
            userID: 'superadminuser',
        };

        const response = await request(app)
            .post('/channel/addUserToChannel')
            .set('Authorization', `Bearer ${token}`)
            .send(addUserRequest)
            .expect(404);

        expect(response.body.error).toBe('Channel not found');
    });

    it('should return an error if the user is not found', async () => {
        const adminUser = await TestHelpers.createTestSuperAdmin([]);

        const team = await TestHelpers.createTestTeam('Test Team', adminUser._id, [], []);

        const channel = await TestHelpers.createTestChannel('Test Channel', team._id, adminUser._id, []);

        team.channels.push(channel._id);
        await team.save();

        const token = await TestHelpers.generateToken(adminUser.userID, adminUser.email);

        const addUserRequest = {
            channelID: (channel._id).toString(),
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
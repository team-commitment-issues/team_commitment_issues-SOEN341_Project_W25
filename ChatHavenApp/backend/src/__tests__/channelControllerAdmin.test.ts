import request from 'supertest';
import express from 'express';
import channelRoutes from '../routes/channelRoutes';
import authenticate from '../middlewares/authMiddleware';
import { checkTeamPermission, checkChannelPermission } from '../middlewares/permissionMiddleware';
import { Role, TeamRole } from '../enums';
import mongoose from 'mongoose';
import TestHelpers from './testHelpers';
import Channel from '../models/Channel';
import { Message } from '../models/Message';
import Team from '../models/Team';
import User from '../models/User';
import TeamMember from '../models/TeamMember';

const app = express();
app.use(express.json());
app.use('/channel', authenticate, checkTeamPermission(TeamRole.ADMIN), checkChannelPermission(), channelRoutes);

TestHelpers.addConnectionHooks(describe);

beforeAll(async () => {
    await TestHelpers.cleanDatabase();
});

afterAll(async () => {
    await TestHelpers.disconnectMongoose();
});

describe('POST /channel/addUserToChannel', () => {
    it('should add a user to a channel successfully', async () => {
        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const token = await TestHelpers.generateToken(superAdminUser.username, superAdminUser.email);

        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const team = await TestHelpers.createTestTeam('Test Team', superAdminUser._id, [], []);

        const teamMember = await TestHelpers.createTestTeamMember(user._id, team._id, TeamRole.MEMBER, []);

        team.teamMembers.push(teamMember._id);
        await team.save();

        user.teamMemberships.push(teamMember._id);
        await user.save();

        const channel = await TestHelpers.createTestChannel('Test Channel', team._id, superAdminUser._id, [teamMember._id], []);

        team.channels.push(channel._id);
        await team.save();

        const requestPayload = { 
            username: user.username,
            teamName: team.name,
            channelName: channel.name
        };

        const response = await request(app)
            .post(`/channel/addUserToChannel`)
            .set('Authorization', `Bearer ${token}`)
            .send(requestPayload)
            .expect(201);

        expect(response.body.message).toBe('User added to channel successfully');
    });

    it('should return an error if the user is not authorized', async () => {
        const adminUser = await TestHelpers.createTestSuperAdmin([]);
        const team = await TestHelpers.createTestTeam('Test Team', adminUser._id, [], []);

        const requestPayload = {
            teamName: team.name,
            channelName: 'Test Channel',
            username: 'useruser',
        };

        const response = await request(app)
            .post(`/channel/addUserToChannel`)
            .send(requestPayload)
            .expect(401);

        expect(response.body.error).toBe('Unauthorized: No token provided');
    });

    it('should return an error if the channel is not found', async () => {
        const adminUser = await TestHelpers.createTestSuperAdmin([]);

        const token = await TestHelpers.generateToken(adminUser.username, adminUser.email);

        const team = await TestHelpers.createTestTeam('Test Team', adminUser._id, [], []);

        const requestPayload = {
            teamName: team.name,
            channelName: 'Nonexistent Channel',
            username: 'superadminuser',
        };

        const response = await request(app)
            .post(`/channel/addUserToChannel`)
            .set('Authorization', `Bearer ${token}`)
            .send(requestPayload)
            .expect(404);
    });

    it('should return an error if the user is not found', async () => {
        const adminUser = await TestHelpers.createTestSuperAdmin([]);

        const team = await TestHelpers.createTestTeam('Test Team', adminUser._id, [], []);

        const channel = await TestHelpers.createTestChannel('Test Channel', team._id, adminUser._id, [], []);

        team.channels.push(channel._id);
        await team.save();

        const token = await TestHelpers.generateToken(adminUser.username, adminUser.email);

        const requestPayload = {
            teamName: team.name,
            channelName: channel.name,
            username: 'nonexistentuser',
        };

        const response = await request(app)
            .post(`/channel/addUserToChannel`)
            .set('Authorization', `Bearer ${token}`)
            .send(requestPayload)
            .expect(404);

        expect(response.body.error).toBe('User not found');
    });
});

describe('POST /channel/removeUserFromChannel', () => {
    it('should remove a user from a channel successfully', async () => {
        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const token = await TestHelpers.generateToken(superAdminUser.username, superAdminUser.email);

        const user = await TestHelpers.createTestUser('test', 'testpassword', 'Test', 'User', 'testuser', Role.USER, []);

        const team = await TestHelpers.createTestTeam('Test Team', superAdminUser._id, [], []);

        const teamMember = await TestHelpers.createTestTeamMember(user._id, team._id, TeamRole.MEMBER, []);

        team.teamMembers.push(teamMember._id);
        await team.save();

        user.teamMemberships.push(teamMember._id);
        await user.save();

        const channel = await TestHelpers.createTestChannel('Test Channel', team._id, superAdminUser._id, [teamMember._id], []);

        team.channels.push(channel._id);
        await team.save();
        
        const requestPayload = {
            username: user.username,
            teamName: team.name,
            channelName: channel.name
        };

        const response = await request(app)
            .post(`/channel/removeUserFromChannel`)
            .set('Authorization', `Bearer ${token}`)
            .send(requestPayload)
            .expect(200);

        expect(response.body.message).toBe('User removed from channel successfully');

        const updatedChannel = await
            Channel.findOne({ name: channel.name }).populate('members');
        expect(updatedChannel?.members).not.toContain(user._id);

        const updatedTeamMember = await
            TeamMember.findOne({ user: user._id, team: team._id });
        expect(updatedTeamMember?.channels).not.toContain(channel._id);
    });
});

describe('POST /channel/deleteChannel', () => {
    it('should delete a channel successfully', async () => {
        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const team = await TestHelpers.createTestTeam('Test Team', superAdminUser._id, [], []);

        const channel = await TestHelpers.createTestChannel('Test Channel', team._id, superAdminUser._id, [], []);

        team.channels.push(channel._id);
        await team.save();

        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const teamMember = await TestHelpers.createTestTeamMember(user._id, team._id, TeamRole.ADMIN, [channel._id]);

        team.teamMembers.push(teamMember._id);
        await team.save();

        user.teamMemberships.push(teamMember._id);
        await user.save();

        channel.members.push(user._id);
        await channel.save();

        const message = await TestHelpers.createTestMessage("test message", user.username, channel._id);

        channel.messages.push(message._id);
        await channel.save();

        const token = await TestHelpers.generateToken(user.username, user.email);

        const requestPayload = {
            teamName: team.name,
            channelName: channel.name
        };

        const response = await request(app)
            .post(`/channel/deleteChannel`)
            .set('Authorization', `Bearer ${token}`)
            .send(requestPayload)
            .expect(200);

        expect(response.body.message).toBe('Channel deleted successfully');
        const deletedChannel = await Channel.findOne({ name: channel.name });
        expect(deletedChannel).toBeNull();
        const deletedMessage = await Message.findOne({ channel: channel._id });
        expect(deletedMessage).toBeNull();
        const updatedTeam = await Team.findById(team._id);
        expect(updatedTeam?.channels).not.toContain(channel._id);
    });

    it('should return an error if the user is not authorized', async () => {
        const requestPayload = {
            teamName: 'Test Team',
            channelName: 'Test Channel',
        };

        const response = await request(app)
            .post(`/channel/deleteChannel`)
            .send(requestPayload)
            .expect(401);

        expect(response.body.error).toBe('Unauthorized: No token provided');
    });

    it('should return an error if the channel is not found', async () => {
        const adminUser = await TestHelpers.createTestSuperAdmin([]);

        const token = await TestHelpers.generateToken(adminUser.username, adminUser.email);

        const requestPayload = {
            teamName: 'Test Team',
            channelName: 'Nonexistent Channel',
        };

        const response = await request(app)
            .post(`/channel/deleteChannel`)
            .set('Authorization', `Bearer ${token}`)
            .send(requestPayload)
            .expect(404);
    });
});

describe('POST /channel/deleteMessage', () => {
    it('should delete a message successfully', async () => {
        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const team = await TestHelpers.createTestTeam('Test Team', superAdminUser._id, [], []);

        const channel = await TestHelpers.createTestChannel('Test Channel', team._id, superAdminUser._id, [], []);

        const user = await TestHelpers.createTestUser('test@test.com', 'testpassword', 'Test', 'User', 'testuser', Role.USER, []);
        const teamMember = await TestHelpers.createTestTeamMember(user._id, team._id, TeamRole.MEMBER, []);
        team.teamMembers.push(teamMember._id);
        await team.save();
        user.teamMemberships.push(teamMember._id);
        await user.save();

        channel.members.push(user._id);
        await channel.save();

        const message = await TestHelpers.createTestMessage('Test message', user.username, channel._id);

        channel.messages.push(message._id);
        await channel.save();

        const token = await TestHelpers.generateToken(superAdminUser.username, superAdminUser.email);

        const requestPayload = {
            teamName: team.name,
            channelName: channel.name,
            messageId: message._id
        };

        const response = await request(app)
            .post(`/channel/deleteMessage`)
            .set('Authorization', `Bearer ${token}`)
            .send(requestPayload)
            .expect(200);

        expect(response.body.message).toBe('Message deleted successfully');
        
        const updatedChannel = await
            Channel.findOne({ name: channel.name }).populate('messages');
        expect(updatedChannel?.messages).not.toContain(message._id);
        const deletedMessage = await
            Message.findOne({ _id: message._id });
        expect(deletedMessage).toBeNull();
    });

    it('should return an error if the user is not authorized', async () => {
        const requestPayload = {
            teamName: 'Test Team',
            channelName: 'Test Channel',
            messageId: new mongoose.Types.ObjectId()
        };

        const response = await request(app)
            .post(`/channel/deleteMessage`)
            .send(requestPayload)
            .expect(401);

        expect(response.body.error).toBe('Unauthorized: No token provided');
    });

    it('should return an error if the channel is not found', async () => {
        const adminUser = await TestHelpers.createTestSuperAdmin([]);

        const token = await TestHelpers.generateToken(adminUser.username, adminUser.email);

        const requestPayload = {
            teamName: 'Test Team',
            channelName: 'Nonexistent Channel',
            messageId: new mongoose.Types.ObjectId()
        };

        const response = await request(app)
            .post(`/channel/deleteMessage`)
            .set('Authorization', `Bearer ${token}`)
            .send(requestPayload)
            .expect(404);
    });

    it('should return an error if the message is not found', async () => {
        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const team = await TestHelpers.createTestTeam('Test Team', superAdminUser._id, [], []);

        const channel = await TestHelpers.createTestChannel('Test Channel', team._id, superAdminUser._id, [], []);

        const user = await TestHelpers.createTestUser('Test', 'testpassword', 'Test', 'User', 'testuser', Role.USER, []);
        const teamMember = await TestHelpers.createTestTeamMember(user._id, team._id, TeamRole.MEMBER, []);

        team.teamMembers.push(teamMember._id);
        await team.save();

        user.teamMemberships.push(teamMember._id);
        await user.save();

        channel.members.push(user._id);
        await channel.save();

        const token = await TestHelpers.generateToken(superAdminUser.username, superAdminUser.email);

        const requestPayload = {
            teamName: team.name,
            channelName: channel.name,
            messageId: new mongoose.Types.ObjectId()
        };

        const response = await request(app)
            .post(`/channel/deleteMessage`)
            .set('Authorization', `Bearer ${token}`)
            .send(requestPayload)
            .expect(404);

        expect(response.body.error).toBe('Message not found');
    });
});
import request from 'supertest';
import express from 'express';
import superAdminRoutes from '../routes/superAdminRoutes';
import authenticate from '../middlewares/authMiddleware';
import { checkTeamPermission, checkUserPermission, checkChannelPermission } from '../middlewares/permissionMiddleware';
import { Role, TeamRole } from '../enums';
import mongoose from 'mongoose';
import TestHelpers from './testHelpers';
import Team from '../models/Team';
import TeamMember from '../models/TeamMember';
import User from '../models/User';

const app = express();
app.use(express.json());
app.use('/superadmin', authenticate, checkUserPermission(Role.SUPER_ADMIN), checkTeamPermission(TeamRole.ADMIN), superAdminRoutes);

beforeAll(async () => {
    await TestHelpers.ensureDbConnection();
});

describe('POST /superadmin/addUserToTeam', () => {
    it('should add a user to a team successfully', async () => {
        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const team = await TestHelpers.createTestTeam('Test Team', superAdminUser._id, [], []);

        const token = await TestHelpers.generateToken(superAdminUser.username, superAdminUser.email);

        const addUserRequest = {
            username: user.username,
            role: 'MEMBER',
            teamName: team.name
        };

        const response = await request(app)
            .post(`/superadmin/addUserToTeam`)
            .set('Authorization', `Bearer ${token}`)
            .send(addUserRequest)
            .expect(201);

        expect(response.body.message).toBe('User added to team successfully');
        expect(response.body.teamMember.user).toBe(user._id.toString());
    });

    it('should return an error if the team is not found', async () => {
        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const token = await TestHelpers.generateToken(superAdminUser.username, superAdminUser.email);

        const addUserRequest = {
            username: user.username,
            role: 'MEMBER',
            teamName: 'Test Team'
        };

        const response = await request(app)
            .post(`/superadmin/addUserToTeam`)
            .set('Authorization', `Bearer ${token}`)
            .send(addUserRequest)
            .expect(404);
    });

    it('should return an error if the user is not found', async () => {
        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const team = await TestHelpers.createTestTeam('Test Team', superAdminUser._id, [], []);

        const token = await TestHelpers.generateToken(superAdminUser.username, superAdminUser.email);

        const addUserRequest = {
            username: 'testuser',
            role: 'MEMBER',
            teamName: team.name
        };

        const response = await request(app)
            .post(`/superadmin/addUserToTeam`)
            .set('Authorization', `Bearer ${token}`)
            .send(addUserRequest)
            .expect(400);

        expect(response.body.error).toBe('User not found');
    });

    it('should return an error if the user is not authorized', async () => {
        const addUserRequest = {
            username: 'testuser',
            role: 'MEMBER',
            teamName: 'Test Team'
        };

        const response = await request(app)
            .post(`/superadmin/addUserToTeam`)
            .send(addUserRequest)
            .expect(401);

        expect(response.body.error).toBe('Unauthorized: No token provided');
    });
});

describe('POST /superadmin/removeUserFromTeam', () => {
    it('should remove a user from a team successfully', async () => {
        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const team = await TestHelpers.createTestTeam('Test Team', superAdminUser._id, [], []);

        const token = await TestHelpers.generateToken(superAdminUser.username, superAdminUser.email);

        const teamMember = await TestHelpers.createTestTeamMember(user._id, team._id, TeamRole.MEMBER, []);

        user.teamMemberships.push(teamMember._id);
        await user.save();

        team.teamMembers.push(teamMember._id);
        await team.save();

        const removeUserRequest = {
            username: user.username,
            teamName: team.name
        };

        const response = await request(app)
            .post(`/superadmin/removeUserFromTeam`)
            .set('Authorization', `Bearer ${token}`)
            .send(removeUserRequest)
            .expect(200);
        expect(response.body.message).toBe('User removed from team successfully');
    });
});

describe('POST /superadmin/deleteTeam', ()    => {
    it('should delete a team successfully', async () => {
        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const team = await TestHelpers.createTestTeam('Test Team', superAdminUser._id, [], []);

        const token = await TestHelpers.generateToken(superAdminUser.username, superAdminUser.email);

        const teamMember = await TestHelpers.createTestTeamMember(user._id, team._id, TeamRole.MEMBER, []);

        user.teamMemberships.push(teamMember._id);
        await user.save();

        team.teamMembers.push(teamMember._id);
        await team.save();

        const channel = await TestHelpers.createTestChannel('Test Channel', team._id, superAdminUser._id, [teamMember._id], []);

        team.channels.push(channel._id);
        await team.save();

        teamMember.channels.push(channel._id);
        await teamMember.save();

        const message = await TestHelpers.createTestMessage('Test message', user._id, channel._id);

        const deleteTeamRequest = {
            teamName: team.name,
            channelName: channel.name
        };

        const response = await request(app)
            .post(`/superadmin/deleteTeam`)
            .set('Authorization', `Bearer ${token}`)
            .send(deleteTeamRequest)
            .expect(200);

        expect(response.body.message).toBe('Team deleted successfully');
        const foundTeam = await Team.findById(team._id);
        expect(foundTeam).toBeNull();
        const foundTeamMember = await TeamMember.findById(teamMember._id);
        expect(foundTeamMember).toBeNull();
        const updatedUser = await User.findById(user._id);
        expect(updatedUser!.teamMemberships).not.toContain(teamMember._id);
    });
});

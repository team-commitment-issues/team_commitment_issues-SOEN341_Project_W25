import request from 'supertest';
import express from 'express';
import dashboardRoutes from '../routes/dashboardRoutes';
import authenticate from '../middlewares/authMiddleware';
import { checkTeamPermission } from '../middlewares/permissionMiddleware';
import { TeamRole } from '../enums';
import TestHelpers from './testHelpers';
import { Role } from '../enums';

const app = express();
app.use(express.json());
app.use('/dashboard', authenticate, checkTeamPermission(TeamRole.MEMBER), dashboardRoutes);

describe('POST /dashboard/listChannels', () => {
    it('should list all channels for the authenticated user in a team', async () => {
        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const team = await TestHelpers.createTestTeam('Test Team', user._id, [], []);

        const teamMember = await TestHelpers.createTestTeamMember(user._id, team._id, TeamRole.MEMBER, []);

        user.teamMemberships.push(teamMember._id);
        await user.save();

        team.teamMembers.push(teamMember._id);
        await team.save();

        const channel = await TestHelpers.createTestChannel('TestChannel', team._id, user._id, [teamMember._id], []);

        team.channels.push(channel._id);
        await team.save();

        teamMember.channels.push(channel._id);
        await teamMember.save();

        const token = await TestHelpers.generateToken(user.username, user.email);

        const response = await request(app)
            .post('/dashboard/listChannels')
            .set('Authorization', `Bearer ${token}`)
            .send({ teamName: team.name })
            .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0].name).toBe('TestChannel');
    });

    it('should return an error if the user is not authenticated', async () => {
        const teamName = 'Test Team';
        const response = await request(app)
            .post('/dashboard/listChannels')
            .send({ teamName })
            .expect(401);

        expect(response.body.error).toBe('Unauthorized: No token provided');
    });

    it('should return an error if the team is not found', async () => {
        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const token = await TestHelpers.generateToken(user.username, user.email);

        const teamName = 'Test Team';

        const response = await request(app)
            .post('/dashboard/listChannels')
            .set('Authorization', `Bearer ${token}`)
            .send({ teamName })
            .expect(404);
    });
});

describe('POST /dashboard/listUsersInChannel', () => {
    it('should list all users in a specific channel for the authenticated user in a team', async () => {
        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const team = await TestHelpers.createTestTeam('Test Team', user._id, [], []);

        const teamMember = await TestHelpers.createTestTeamMember(user._id, team._id, TeamRole.MEMBER, []);

        user.teamMemberships.push(teamMember._id);
        await user.save();

        team.teamMembers.push(teamMember._id);
        await team.save();

        const channel = await TestHelpers.createTestChannel('TestChannel', team._id, user._id, [teamMember._id], []);

        team.channels.push(channel._id);
        await team.save();

        teamMember.channels.push(channel._id);
        await teamMember.save();

        const token = await TestHelpers.generateToken(user.username, user.email);

        const response = await request(app)
            .post('/dashboard/listUsersInChannel')
            .set('Authorization', `Bearer ${token}`)
            .send({ teamName: team.name, channelName: channel.name })
            .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0].username).toBe('useruser');
    });

    it('should return an error if the user is not authenticated', async () => {
        const teamName = 'Test Team';
        const channelName = 'TestChannel';
        const response = await request(app)
            .post('/dashboard/listUsersInChannel')
            .send({ teamName, channelName })
            .expect(401);

        expect(response.body.error).toBe('Unauthorized: No token provided');
    });

    it('should return an error if the team is not found', async () => {
        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const token = await TestHelpers.generateToken(user.username, user.email);

        const teamName = 'NonExistentTeam';
        const channelName = 'TestChannel';

        const response = await request(app)
            .post('/dashboard/listUsersInChannel')
            .set('Authorization', `Bearer ${token}`)
            .send({ teamName, channelName })
            .expect(404);
    });

    it('should return an error if the channel is not found', async () => {
        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const team = await TestHelpers.createTestTeam('Test Team', user._id, [], []);

        const token = await TestHelpers.generateToken(user.username, user.email);

        const teamName = team.name;
        const channelName = 'NonExistentChannel';

        const response = await request(app)
            .post('/dashboard/listUsersInChannel')
            .set('Authorization', `Bearer ${token}`)
            .send({ teamName, channelName })
            .expect(404);
    });
});

describe('POST /dashboard/listUsersInTeam', () => {
    it('should list all users in a specific team for the authenticated user', async () => {
        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const team = await TestHelpers.createTestTeam('Test Team', user._id, [], []);

        const teamMember = await TestHelpers.createTestTeamMember(user._id, team._id, TeamRole.MEMBER, []);

        user.teamMemberships.push(teamMember._id);
        await user.save();

        team.teamMembers.push(teamMember._id);
        await team.save();

        const token = await TestHelpers.generateToken(user.username, user.email);

        const response = await request(app)
            .post('/dashboard/listUsersInTeam')
            .set('Authorization', `Bearer ${token}`)
            .send({ teamName: team.name })
            .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0].username).toBe('useruser');
    });

    it('should return an error if the user is not authenticated', async () => {
        const teamName = 'Test Team';
        const response = await request(app)
            .post('/dashboard/listUsersInTeam')
            .send({ teamName })
            .expect(401);

        expect(response.body.error).toBe('Unauthorized: No token provided');
    });

    it('should return an error if the team is not found', async () => {
        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const token = await TestHelpers.generateToken(user.username, user.email);

        const teamName = 'NonExistentTeam';

        const response = await request(app)
            .post('/dashboard/listUsersInTeam')
            .set('Authorization', `Bearer ${token}`)
            .send({ teamName })
            .expect(404);
    });
});

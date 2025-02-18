import request from 'supertest';
import express from 'express';
import dashboardRoutes from '../routes/dashboardRoutes';
import authenticate from '../middlewares/authMiddleware';
import { TeamRole } from '../enums';
import mongoose from 'mongoose';
import TestHelpers from './testHelpers';
import { Role } from '../enums';

const app = express();
app.use(express.json());
app.use('/dashboard', authenticate, dashboardRoutes);

describe('GET /dashboard/listTeams', () => {
    it('should list all teams for the authenticated user', async () => {
        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const team = await TestHelpers.createTestTeam('Test Team', user._id, [], []);

        const teamMember = await TestHelpers.createTestTeamMember(user._id, team._id, TeamRole.MEMBER, []);

        team.teamMembers.push(teamMember._id);
        await team.save();

        user.teamMemberships.push(teamMember._id);
        await user.save();

        const token = await TestHelpers.generateToken(user.userID, user.email);

        const response = await request(app)
            .get('/dashboard/listTeams')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0].name).toBe('Test Team');
    });

    it('should return an error if the user is not authenticated', async () => {
        const response = await request(app)
            .get('/dashboard/listTeams')
            .expect(401);

        expect(response.body.error).toBe('Unauthorized: No token provided');
    });
});

describe('GET /dashboard/listChannels', () => {
    it('should list all channels for the authenticated user in a team', async () => {
        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const team = await TestHelpers.createTestTeam('Test Team', user._id, [], []);

        const teamMember = await TestHelpers.createTestTeamMember(user._id, team._id, TeamRole.MEMBER, []);

        user.teamMemberships.push(teamMember._id);
        await user.save();

        team.teamMembers.push(teamMember._id);
        await team.save();

        const channel = await TestHelpers.createTestChannel('Test Channel', team._id, user._id, [teamMember._id]);

        team.channels.push(channel._id);
        await team.save();

        teamMember.channels.push(channel._id);
        await teamMember.save();

        const token = await TestHelpers.generateToken(user.userID, user.email);

        const response = await request(app)
            .get('/dashboard/listChannels')
            .set('Authorization', `Bearer ${token}`)
            .send({ team: team._id })
            .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0].name).toBe('Test Channel');
    });

    it('should return an error if the user is not authenticated', async () => {
        const response = await request(app)
            .get('/dashboard/listChannels')
            .expect(401);

        expect(response.body.error).toBe('Unauthorized: No token provided');
    });

    it('should return an error if the team is not found', async () => {
        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const token = await TestHelpers.generateToken(user.userID, user.email);

        const response = await request(app)
            .get('/dashboard/listChannels')
            .set('Authorization', `Bearer ${token}`)
            .send({ team: new mongoose.Types.ObjectId().toString() })
            .expect(404);

        expect(response.body.error).toBe('Team not found');
    });
});
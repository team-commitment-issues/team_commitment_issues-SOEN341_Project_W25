import request from 'supertest';
import express from 'express';
import dashboardRoutes from '../routes/dashboardRoutes';
import authenticate from '../middlewares/authMiddleware';
import { TeamRole } from '../enums';
import TestHelpers from './testHelpers';
import { Role } from '../enums';

const app = express();
app.use(express.json());
app.use('/dashboard', authenticate, dashboardRoutes);

beforeAll(async () => {
    await TestHelpers.ensureDbConnection();
});

describe('GET /dashboard/listTeams', () => {
    it('should list all teams for the authenticated user', async () => {
        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const team = await TestHelpers.createTestTeam('Test Team', user._id, [], []);

        const teamMember = await TestHelpers.createTestTeamMember(user._id, team._id, TeamRole.MEMBER, []);

        team.teamMembers.push(teamMember._id);
        await team.save();

        user.teamMemberships.push(teamMember._id);
        await user.save();

        const token = await TestHelpers.generateToken(user.username, user.email);

        const response = await request(app)
            .get(`/dashboard/listTeams`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toMatchObject({ name: 'Test Team' });
    });

    it('should return an error if the user is not authenticated', async () => {
        const response = await request(app)
            .get('/dashboard/listTeams')
            .expect(401);

        expect(response.body.error).toBe('Unauthorized: No token provided');
    });
});
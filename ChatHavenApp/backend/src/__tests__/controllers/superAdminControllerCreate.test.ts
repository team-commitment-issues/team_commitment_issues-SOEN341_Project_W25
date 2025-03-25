import request from 'supertest';
import express from 'express';
import superAdminRoutes from '../../routes/superAdminRoutes';
import authenticate from '../../middlewares/authMiddleware';
import { checkTeamPermission, checkUserPermission, checkChannelPermission } from '../../middlewares/permissionMiddleware';
import { Role, TeamRole } from '../../enums';
import mongoose from 'mongoose';
import TestHelpers from '../testHelpers';
import Team from '../../models/Team';
import TeamMember from '../../models/TeamMember';
import User from '../../models/User';

const app = express();
app.use(express.json());
app.use('/superadmin', authenticate, checkUserPermission(Role.SUPER_ADMIN), superAdminRoutes);

describe('POST /superadmin/createTeam', () => {
    it('should create a new team successfully', async () => {
        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const token = await TestHelpers.generateToken(superAdminUser.username, superAdminUser.email);

        const teamName = 'Test Team';

        const response = await request(app)
            .post('/superadmin/createTeam')
            .set('Authorization', `Bearer ${token}`)
            .send({ teamName })
            .expect(201);

        expect(response.body.message).toBe('Team created successfully');
    });

    it('should return an error if the team already exists', async () => {
        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const team = await TestHelpers.createTestTeam('Existing Team', superAdminUser._id, [], []);

        const token = await TestHelpers.generateToken(superAdminUser.username, superAdminUser.email);

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
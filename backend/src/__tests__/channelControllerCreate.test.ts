import request from 'supertest';
import express from 'express';
import channelRoutes from '../routes/channelRoutes';
import authenticate from '../middlewares/authMiddleware';
import { checkTeamPermission } from '../middlewares/permissionMiddleware';
import { TeamRole } from '../enums';
import TestHelpers from './testHelpers';

const app = express();
app.use(express.json());
app.use('/channel', authenticate, checkTeamPermission(TeamRole.ADMIN), channelRoutes);

describe('POST /channel/createChannel', () => {
    it('should create a new channel successfully', async () => {
        const user = await TestHelpers.createTestSuperAdmin([]);

        const team = await TestHelpers.createTestTeam('Test Team', user._id, [], []);

        const token = await TestHelpers.generateToken(user.username, user.email);

        const name = 'Test Channel';

        const response = await request(app)
            .post('/channel/createChannel')
            .set('Authorization', `Bearer ${token}`)
            .send({ teamName: team.name, channelName: name })
            .expect(201);

        expect(response.body.message).toBe('Channel created successfully');
        expect(response.body.channel.name).toBe(name);
    });

    it('should return an error if the user is not authorized', async () => {
        const newChannel = {
            teamName: 'Test Team',
            channelName: 'Test Channel',
        };

        const response = await request(app)
            .post('/channel/createChannel')
            .send(newChannel)
            .expect(401);

        expect(response.body.error).toBe('Unauthorized: No token provided');
    });

    it('should return an error if the team is not found', async () => {
        const user = await TestHelpers.createTestSuperAdmin([]);

        const token = await TestHelpers.generateToken(user.username, user.email);

        const newChannel = {
            teamName: 'Nonexistent Team',
            channelName: 'Test Channel',
        };

        const response = await request(app)
            .post('/channel/createChannel')
            .set('Authorization', `Bearer ${token}`)
            .send(newChannel)
            .expect(404);
    });
});
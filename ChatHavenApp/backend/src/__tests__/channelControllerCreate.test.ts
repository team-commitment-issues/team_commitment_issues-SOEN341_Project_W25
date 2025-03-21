import request from 'supertest';
import express from 'express';
import channelRoutes from '../routes/channelRoutes';
import authenticate from '../middlewares/authMiddleware';
import { checkTeamPermission } from '../middlewares/permissionMiddleware';
import { Role, TeamRole } from '../enums';
import TestHelpers from './testHelpers';

const app = express();
app.use(express.json());
app.use('/channel', authenticate, checkTeamPermission(TeamRole.ADMIN), channelRoutes);

TestHelpers.addConnectionHooks(describe);

beforeAll(async () => {
    await TestHelpers.cleanDatabase();
});

afterAll(async () => {
    await TestHelpers.disconnectMongoose();
});

describe('POST /channel/createChannel', () => {
    it('should create a new channel successfully', async () => {
        const user = await TestHelpers.createTestSuperAdmin([]);

        const team = await TestHelpers.createTestTeam('Test Team', user._id, [], []);

        const token = await TestHelpers.generateToken(user.username, user.email);

        const name = 'Test Channel';

        const response = await request(app)
            .post('/channel/createChannel')
            .set('Authorization', `Bearer ${token}`)
            .send({ teamName: team.name, channelName: name, selectedTeamMembers: [] })
            .expect(201);

        expect(response.body.message).toBe('Channel created successfully');
        expect(response.body.channel.name).toBe(name);
    });

    it('should return an error if the user is not authorized', async () => {
        const newChannel = {
            teamName: 'Test Team',
            channelName: 'Test Channel',
            selectedTeamMembers: [],
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
            selectedTeamMembers: [],
        };

        const response = await request(app)
            .post('/channel/createChannel')
            .set('Authorization', `Bearer ${token}`)
            .send(newChannel)
            .expect(404);
    });

    it('should add all selected team members (users) to the channel', async () => {
        const user = await TestHelpers.createTestSuperAdmin([]);
        const user1 = await TestHelpers.createTestUser('user1@user1.com', '1234', 'user1', 'User1', 'user1', Role.USER, []);
        const user2 = await TestHelpers.createTestUser('user2@user2.com', '1234', 'user2', 'User2', 'user2', Role.USER, []);

        const team = await TestHelpers.createTestTeam('Test Team', user._id, [], []);

        const teamMember1 = await TestHelpers.createTestTeamMember(user1._id, team._id, TeamRole.MEMBER, []);
        const teamMember2 = await TestHelpers.createTestTeamMember(user2._id, team._id, TeamRole.MEMBER, []);

        user1.teamMemberships.push(teamMember1._id);
        user2.teamMemberships.push(teamMember2._id);
        await user1.save();
        await user2.save();

        team.teamMembers.push(teamMember1._id);
        team.teamMembers.push(teamMember2._id);
        await team.save();

        const token = await TestHelpers.generateToken(user.username, user.email);

        const name = 'Test Channel';

        const response = await request(app)
            .post('/channel/createChannel')
            .set('Authorization', `Bearer ${token}`)
            .send({ teamName: team.name, channelName: name, selectedTeamMembers: [user1.username, user2.username] })
            .expect(201);

        expect(response.body.message).toBe('Channel created successfully');
        expect(response.body.channel.name).toBe(name);
    });
        
});
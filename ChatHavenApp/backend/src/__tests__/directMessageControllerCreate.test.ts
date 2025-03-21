import request from 'supertest';
import express from 'express';
import directMessageRoutes from '../routes/directMessageRoutes';
import authenticate from '../middlewares/authMiddleware';
import { checkTeamPermission } from '../middlewares/permissionMiddleware';
import { Role, TeamRole } from '../enums';
import TestHelpers from './testHelpers';
import DirectMessage from '../models/DirectMessage';

const app = express();
app.use(express.json());
app.use('/directMessage', authenticate, checkTeamPermission(TeamRole.MEMBER), directMessageRoutes);

TestHelpers.addConnectionHooks(describe);

beforeAll(async () => {
    await TestHelpers.cleanDatabase();
});

afterAll(async () => {
    await TestHelpers.disconnectMongoose();
});

describe('POST /directMessage/createDirectMessage', () => {
    it('should create a direct message successfully', async () => {
        const user = await TestHelpers.createTestUser('test@test.com', 'testpassword', 'Test', 'User', 'testuser', Role.USER, []);

        const token = await TestHelpers.generateToken(user.username, user.email);

        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const team = await TestHelpers.createTestTeam('Test Team', superAdminUser._id, [], []);

        const teamMember = await TestHelpers.createTestTeamMember(user._id, team._id, TeamRole.MEMBER, []);

        team.teamMembers.push(teamMember._id);
        await team.save();

        user.teamMemberships.push(teamMember._id);
        await user.save();

        const receiver = await TestHelpers.createTestUser('test2@test2.com', 'testpassword', 'Test2', 'User2', 'testuser2', Role.USER, []);

        const receiverTeamMember = await TestHelpers.createTestTeamMember(receiver._id, team._id, TeamRole.MEMBER, []);

        team.teamMembers.push(receiverTeamMember._id);
        await team.save();

        receiver.teamMemberships.push(receiverTeamMember._id);
        await receiver.save();

        const payload = {
            teamName: 'Test Team',
            receiver: receiver.username
        };

        const response = await request(app)
            .post(`/directMessage/createDirectMessage`)
            .set('Authorization', `Bearer ${token}`)
            .send(payload)
            .expect(201);

        const foundDirectMessage = await DirectMessage.findOne({ users: { $all: [user._id, receiver._id] } });
        expect(foundDirectMessage).toBeTruthy();
    });
});
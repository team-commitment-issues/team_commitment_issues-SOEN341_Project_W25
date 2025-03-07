import request from 'supertest';
import express from 'express';
import channelRoutes from '../routes/channelRoutes';
import authenticate from '../middlewares/authMiddleware';
import { checkTeamPermission, checkUserPermission, checkChannelPermission } from '../middlewares/permissionMiddleware';
import { Role, TeamRole } from '../enums';
import TestHelpers from './testHelpers';
import Channel from '../models/Channel';
import exp from 'constants';
import { Message } from '../models/Message';

const app = express();
app.use(express.json());
app.use('/channel', authenticate, checkTeamPermission(TeamRole.MEMBER), checkChannelPermission(), channelRoutes);

describe('POST /channel/getMessages', () => {
    it('should return all messages in a channel', async () => {
        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const token = await TestHelpers.generateToken(user.username, user.email);

        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const team = await TestHelpers.createTestTeam('Test Team', superAdminUser._id, [], []);

        const teamMember = await TestHelpers.createTestTeamMember(user._id, team._id, TeamRole.MEMBER, []);

        team.teamMembers.push(teamMember._id);
        await team.save();

        user.teamMemberships.push(teamMember._id);
        await user.save();

        const channel = await TestHelpers.createTestChannel('Test Channel', team._id, superAdminUser._id, [teamMember._id], []);

        team.channels.push(channel._id);
        await team.save();

        teamMember.channels.push(channel._id);
        await teamMember.save();

        const message1 = await TestHelpers.createTestMessage('Test message', teamMember._id, channel._id);

        channel.messages.push(message1._id);
        await channel.save();

        const message2 = await TestHelpers.createTestMessage('Test message 2', teamMember._id, channel._id);

        channel.messages.push(message2._id);
        await channel.save();

        const payload = {
            teamName: team.name,
            channelName: channel.name
        };

        const response = await request(app)
            .post(`/channel/getMessages`)
            .set('Authorization', `Bearer ${token}`)
            .send(payload)
            .expect(200);

        expect(response.body).toHaveLength(2);
        const updatedChannel = await Channel.findOne({ name: channel.name });
        expect(updatedChannel?.messages).toHaveLength(2);
        const messages = await Message.find({ channel: updatedChannel?._id });
        const messageTexts = messages.map((m) => m.text);
        expect(messageTexts).toContain('Test message');
        expect(messageTexts).toContain('Test message 2');
    });
});
import request from 'supertest';
import express from 'express';
import channelRoutes from '../routes/directMessageRoutes';
import authenticate from '../middlewares/authMiddleware';
import { checkTeamPermission, checkUserPermission, checkDirectMessagePermission } from '../middlewares/permissionMiddleware';
import { Role, TeamRole } from '../enums';
import TestHelpers from './testHelpers';
import DirectMessage from '../models/DirectMessage';
import DMessage from '../models/DMessage';
import e from 'express';
import User from '../models/User';
import Team from '../models/Team';
import TeamMember from '../models/TeamMember';

const app = express();
app.use(express.json());
app.use('/directMessage', authenticate, checkTeamPermission(TeamRole.MEMBER), checkDirectMessagePermission(), channelRoutes);

describe('POST /directMessage/getDirectMessages', () => {
    it('should return all direct messages between two users', async () => {
        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);
        const token = await TestHelpers.generateToken(user.username, user.email);
        const recipient = await TestHelpers.createTestUser('recipient@user.com', 'testpassword', 'Recipient', 'User', 'recipientuser', Role.USER, []);
        const team = await TestHelpers.createTestTeam('Test Team', user._id, [], []);
        const teamMember = await TestHelpers.createTestTeamMember(user._id, team._id, TeamRole.MEMBER, []);
        team.teamMembers.push(teamMember._id);
        await team.save();
        user.teamMemberships.push(teamMember._id);
        await user.save();
        const recipientTeamMember = await TestHelpers.createTestTeamMember(recipient._id, team._id, TeamRole.MEMBER, []);
        team.teamMembers.push(recipientTeamMember._id);
        await team.save();
        recipient.teamMemberships.push(recipientTeamMember._id);
        await recipient.save();
        const teamMembers = [teamMember._id, recipientTeamMember._id];
        const directMessage = await TestHelpers.createTestDirectMessage(teamMembers, []);
        teamMember.directMessages.push(directMessage._id);
        await teamMember.save();
        recipientTeamMember.directMessages.push(directMessage._id);
        await recipientTeamMember.save();
        const dmessage = new DMessage({ text: 'Test message', username: user.username, directMessage: directMessage._id });
        await dmessage.save();
        directMessage.dmessages.push(dmessage._id);
        await directMessage.save();
        const dmessage2 = new DMessage({ text: 'Test message 2', username: recipient.username, directMessage: directMessage._id });
        await dmessage2.save();
        directMessage.dmessages.push(dmessage2._id);
        await directMessage.save();

        console.log(directMessage);

        const payload = {
            teamName: team.name,
            teamMember: recipient.username
        };

        const response = await request(app)
            .post('/directMessage/getDirectMessages')
            .set('Authorization', `Bearer ${token}`)
            .send(payload)
            .expect(200);

        expect(response.body.directMessages).toHaveLength(2);
        const messageTexts = response.body.directMessages.map((m: any) => m.text);
        expect(messageTexts).toContain('Test message');
        expect(messageTexts).toContain('Test message 2');
        const updatedSender = await TeamMember.findById(teamMember._id);
        const updatedRecipient = await TeamMember.findById(recipientTeamMember._id);
        expect(updatedSender?.directMessages).toHaveLength(1);
        expect(updatedRecipient?.directMessages).toHaveLength(1);

        const updatedDirectMessage = await DirectMessage.findById(directMessage._id);
        expect(updatedDirectMessage?.dmessages).toHaveLength(2);
    });
});
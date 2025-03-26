import request from 'supertest';
import express from 'express';
import directMessageRoutes from '../../routes/directMessageRoutes';
import authenticate from '../../middlewares/authMiddleware';
import {
  checkTeamPermission,
  checkDirectMessagePermission
} from '../../middlewares/permissionMiddleware';
import { Role, TeamRole } from '../../enums';
import TestHelpers from '../testHelpers';
import DirectMessage from '../../models/DirectMessage';
import DMessage from '../../models/DMessage';
import TeamMember from '../../models/TeamMember';

const app = express();
app.use(express.json());
app.use(
  '/directMessage',
  authenticate,
  checkTeamPermission(TeamRole.MEMBER),
  checkDirectMessagePermission(),
  directMessageRoutes
);

describe('POST /directMessage/getDirectMessages', () => {
  it('should return all direct messages between two users', async () => {
    const user = await TestHelpers.createTestUser(
      'user@user.com',
      'testpassword',
      'User',
      'User',
      'useruser',
      Role.USER,
      []
    );
    const token = await TestHelpers.generateToken(user.username, user.email);
    const receiver = await TestHelpers.createTestUser(
      'recipient@user.com',
      'testpassword',
      'Recipient',
      'User',
      'recipientuser',
      Role.USER,
      []
    );
    const team = await TestHelpers.createTestTeam('Test Team', user._id, [], []);
    const teamMember = await TestHelpers.createTestTeamMember(
      user._id,
      team._id,
      TeamRole.MEMBER,
      []
    );
    team.teamMembers.push(teamMember._id);
    await team.save();
    user.teamMemberships.push(teamMember._id);
    await user.save();
    const receiverTeamMember = await TestHelpers.createTestTeamMember(
      receiver._id,
      team._id,
      TeamRole.MEMBER,
      []
    );
    team.teamMembers.push(receiverTeamMember._id);
    await team.save();
    receiver.teamMemberships.push(receiverTeamMember._id);
    await receiver.save();
    const users = [user._id, receiver._id];
    const directMessage = await TestHelpers.createTestDirectMessage(users, []);
    teamMember.directMessages.push(directMessage._id);
    await teamMember.save();
    receiverTeamMember.directMessages.push(directMessage._id);
    await receiverTeamMember.save();
    const dmessage = new DMessage({
      text: 'Test message',
      username: user.username,
      directMessage: directMessage._id
    });
    await dmessage.save();
    directMessage.dmessages.push(dmessage._id);
    await directMessage.save();
    const dmessage2 = new DMessage({
      text: 'Test message 2',
      username: receiver.username,
      directMessage: directMessage._id
    });
    await dmessage2.save();
    directMessage.dmessages.push(dmessage2._id);
    await directMessage.save();

    const payload = {
      teamName: team.name,
      receiver: receiver.username
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
    const updatedRecipient = await TeamMember.findById(receiverTeamMember._id);
    expect(updatedSender?.directMessages).toHaveLength(1);
    expect(updatedRecipient?.directMessages).toHaveLength(1);

    const updatedDirectMessage = await DirectMessage.findById(directMessage._id);
    expect(updatedDirectMessage?.dmessages).toHaveLength(2);
  });
});

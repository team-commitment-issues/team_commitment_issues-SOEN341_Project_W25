import { Role, TeamRole } from '../enums';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Team from '../models/Team';
import Channel from '../models/Channel';
import TeamMember from '../models/TeamMember';
import TestHelpers from './testHelpers';
import DirectMessage from '../models/DirectMessage';
import DMessage from '../models/DMessage';

describe('createTestSuperAdmin', () => {
  it('should create a super admin with the given details', async () => {
    const teamMemberships: mongoose.Types.ObjectId[] = [];

    const superAdminUser = await TestHelpers.createTestSuperAdmin(teamMemberships);

    expect(superAdminUser).toBeDefined();
    expect(superAdminUser.email).toBe('superadmin@user.com');
    expect(superAdminUser.firstName).toBe('Super');
    expect(superAdminUser.lastName).toBe('Admin');
    expect(superAdminUser.username).toBe('superadminuser');
    expect(superAdminUser.role).toBe(Role.SUPER_ADMIN);
    expect(superAdminUser.teamMemberships).toEqual(teamMemberships);
  });
});

describe('createTestUser', () => {
  it('should create a user with the given details', async () => {
    const email = 'test@example.com';
    const password = 'password123';
    const firstName = 'John';
    const lastName = 'Doe';
    const username = 'johndoe';
    const role = Role.USER;
    const teamMemberships: mongoose.Types.ObjectId[] = [];

    const user = await TestHelpers.createTestUser(
      email,
      password,
      firstName,
      lastName,
      username,
      role,
      teamMemberships
    );

    expect(user).toBeDefined();
    expect(user.email).toBe(email);
    expect(user.firstName).toBe(firstName);
    expect(user.lastName).toBe(lastName);
    expect(user.username).toBe(username);
    expect(user.role).toBe(role);
    expect(user.teamMemberships).toEqual(teamMemberships);
  });

  it('should save the user to the database', async () => {
    const email = 'test2@example.com';
    const password = 'password123';
    const firstName = 'Jane';
    const lastName = 'Smith';
    const username = 'janesmith';
    const role = Role.USER;
    const teamMemberships: mongoose.Types.ObjectId[] = [
      new TeamMember()._id as mongoose.Types.ObjectId
    ];

    const user = await TestHelpers.createTestUser(
      email,
      password,
      firstName,
      lastName,
      username,
      role,
      teamMemberships
    );

    const foundUser = await User.findOne({ email });

    expect(foundUser).toBeDefined();
    expect(foundUser?.email).toBe(email);
    expect(foundUser?.firstName).toBe(firstName);
    expect(foundUser?.lastName).toBe(lastName);
    expect(foundUser?.username).toBe(username);
    expect(foundUser?.role).toBe(role);
    expect(foundUser?.teamMemberships).toEqual(teamMemberships);
  });
});

describe('createTestTeam', () => {
  it('should create a team with the given details', async () => {
    const name = 'Test Team';
    const createdBy = new User()._id as mongoose.Types.ObjectId;
    const teamMembers: mongoose.Types.ObjectId[] = [];
    const channels: mongoose.Types.ObjectId[] = [];

    const team = await TestHelpers.createTestTeam(name, createdBy, teamMembers, channels);

    expect(team).toBeDefined();
    expect(team.name).toBe(name);
    expect(team.createdBy).toEqual(createdBy);
    expect(team.teamMembers).toEqual(teamMembers);
    expect(team.channels).toEqual(channels);
  });

  it('should save the team to the database', async () => {
    const name = 'Test Team 2';
    const createdBy = new User()._id as mongoose.Types.ObjectId;
    const teamMembers: mongoose.Types.ObjectId[] = [
      new TeamMember()._id as mongoose.Types.ObjectId
    ];
    const channels: mongoose.Types.ObjectId[] = [new Channel()._id as mongoose.Types.ObjectId];

    const team = await TestHelpers.createTestTeam(name, createdBy, teamMembers, channels);

    const foundTeam = await Team.findOne({ name });

    expect(foundTeam).toBeDefined();
    expect(foundTeam?.name).toBe(name);
    expect(foundTeam?.createdBy).toEqual(createdBy);
    expect(foundTeam?.teamMembers).toEqual(teamMembers);
    expect(foundTeam?.channels).toEqual(channels);
  });
});

describe('createTestChannel', () => {
  it('should create a channel with the given details', async () => {
    const name = 'Test Channel';
    const team = new Team()._id as mongoose.Types.ObjectId;
    const createdBy = new User()._id as mongoose.Types.ObjectId;
    const members: mongoose.Types.ObjectId[] = [];

    const channel = await TestHelpers.createTestChannel(name, team, createdBy, members, []);

    expect(channel).toBeDefined();
    expect(channel.name).toBe(name);
    expect(channel.team).toEqual(team);
    expect(channel.createdBy).toEqual(createdBy);
    expect(channel.members).toEqual(members);
  });

  it('should save the channel to the database', async () => {
    const name = 'Test Channel 2';
    const team = new Team()._id as mongoose.Types.ObjectId;
    const createdBy = new User()._id as mongoose.Types.ObjectId;
    const members: mongoose.Types.ObjectId[] = [new User()._id as mongoose.Types.ObjectId];

    const channel = await TestHelpers.createTestChannel(name, team, createdBy, members, []);

    const foundChannel = await Channel.findOne({ name });

    expect(foundChannel).toBeDefined();
    expect(foundChannel?.name).toBe(name);
    expect(foundChannel?.team).toEqual(team);
    expect(foundChannel?.createdBy).toEqual(createdBy);
    expect(foundChannel?.members).toEqual(members);
  });
});

describe('generateToken', () => {
  it('should sign a token with the given user details', async () => {
    const username = 'testuser';
    const email = 'test@example.com';

    const token = await TestHelpers.generateToken(username, email);

    expect(token).toBeDefined();
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      username: string;
      email: string;
    };
    expect(decoded.username).toBe(username);
    expect(decoded.email).toBe(email);
  });
});

describe('createTestTeamMember', () => {
  it('should create a team member with the given details', async () => {
    const user = new User()._id as mongoose.Types.ObjectId;
    const team = new Team()._id as mongoose.Types.ObjectId;
    const role = TeamRole.MEMBER;
    const channels: mongoose.Types.ObjectId[] = [];

    const teamMember = await TestHelpers.createTestTeamMember(user, team, role, channels);

    expect(teamMember).toBeDefined();
    expect(teamMember.user).toEqual(user);
    expect(teamMember.team).toEqual(team);
    expect(teamMember.role).toBe(role);
    expect(teamMember.channels).toEqual(channels);
  });
});

describe('createTestMessage', () => {
  it('should create a message with the given details', async () => {
    const text = 'Test message';
    const user = new User();
    user.username = 'testuser' as string;
    const channel = new Channel()._id as mongoose.Types.ObjectId;

    const message = await TestHelpers.createTestMessage(text, user.username, channel);

    expect(message).toBeDefined();
    expect(message.text).toBe(text);
    expect(message.username).toEqual(user.username);
    expect(message.channel).toEqual(channel);
    expect(message.createdAt).toBeDefined();
  });
});

describe('createTestDirectMessage', () => {
  it('should create a direct message with the given details', async () => {
    const users: mongoose.Types.ObjectId[] = [];
    const dmessages: mongoose.Types.ObjectId[] = [];

    const directMessage = await TestHelpers.createTestDirectMessage(users, dmessages);

    expect(directMessage).toBeDefined();
    expect(directMessage.users).toEqual(users);
    expect(directMessage.dmessages).toEqual(dmessages);
  });

  it('should save the direct message to the database', async () => {
    const users: mongoose.Types.ObjectId[] = [new TeamMember()._id as mongoose.Types.ObjectId];
    const dmessages: mongoose.Types.ObjectId[] = [new DMessage()._id as mongoose.Types.ObjectId];

    const directMessage = await TestHelpers.createTestDirectMessage(users, dmessages);

    const foundDirectMessage = await DirectMessage.findOne({ users });
    expect(foundDirectMessage).toBeDefined();
    expect(foundDirectMessage?.users).toEqual(users);
    expect(foundDirectMessage?.dmessages).toEqual(dmessages);
  });
});

describe('createTestDMessage', () => {
  it('should create a direct message with the given details', async () => {
    const text = 'Test direct message';
    const username = 'testuser';
    const directMessage = new DirectMessage()._id as mongoose.Types.ObjectId;
    const user = { username };

    const dMessage = await TestHelpers.createTestDMessage(text, username, directMessage);

    expect(dMessage).toBeDefined();
    expect(dMessage.text).toBe(text);
    expect(dMessage.username).toEqual(user.username);
    expect(dMessage.directMessage).toEqual(directMessage);
    expect(dMessage.createdAt).toBeDefined();
  });

  it('should save the direct message to the database', async () => {
    const text = 'Test direct message 2';
    const username = 'testuser';
    const directMessage = new DirectMessage()._id as mongoose.Types.ObjectId;
    const user = { username };

    const dMessage = await TestHelpers.createTestDMessage(text, username, directMessage);

    const foundDMessage = await DMessage.findOne({ text });

    expect(foundDMessage).toBeDefined();
    expect(foundDMessage?.text).toBe(text);
    expect(foundDMessage?.username).toEqual(user.username);
    expect(foundDMessage?.directMessage).toEqual(directMessage);
    expect(foundDMessage?.createdAt).toBeDefined();
  });
});

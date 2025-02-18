import request from 'supertest';
import express from 'express';
import superAdminRoutes from '../routes/superAdminRoutes';
import authenticate from '../middlewares/authMiddleware';
import checkPermission from '../middlewares/permissionMiddleware';
import { Role, TeamRole } from '../enums';
import mongoose from 'mongoose';
import TestHelpers from './testHelpers';
import Team from '../models/Team';
import TeamMember from '../models/TeamMember';
import User from '../models/User';

const app = express();
app.use(express.json());
app.use('/superadmin', authenticate, checkPermission(Role.SUPER_ADMIN), superAdminRoutes);

describe('POST /superadmin/createTeam', () => {
    it('should create a new team successfully', async () => {
        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const token = await TestHelpers.generateToken(superAdminUser.userID, superAdminUser.email);

        const newTeam = {
            teamName: 'Test Team',
        };

        const response = await request(app)
            .post('/superadmin/createTeam')
            .set('Authorization', `Bearer ${token}`)
            .send(newTeam)
            .expect(201);

        expect(response.body.message).toBe('Team created successfully');
        expect(response.body.team.name).toBe(newTeam.teamName);
    });

    it('should return an error if the team already exists', async () => {
        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const team = await TestHelpers.createTestTeam('Existing Team', superAdminUser._id, [], []);

        const token = await TestHelpers.generateToken(superAdminUser.userID, superAdminUser.email);

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

describe('POST /superadmin/addUserToTeam', () => {
    it('should add a user to a team successfully', async () => {
        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const team = await TestHelpers.createTestTeam('Test Team', superAdminUser._id, [], []);

        const token = await TestHelpers.generateToken(superAdminUser.userID, superAdminUser.email);

        const addUserRequest = {
            userID: user._id.toString(),
            teamID: team._id.toString(),
            role: 'MEMBER',
        };

        const response = await request(app)
            .post('/superadmin/addUserToTeam')
            .set('Authorization', `Bearer ${token}`)
            .send(addUserRequest)
            .expect(201);

        expect(response.body.message).toBe('User added to team successfully');
        expect(response.body.teamMember.user).toBe(addUserRequest.userID);
        expect(response.body.teamMember.team).toBe(addUserRequest.teamID);
    });

    it('should return an error if the team is not found', async () => {
        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const token = await TestHelpers.generateToken(superAdminUser.userID, superAdminUser.email);

        const addUserRequest = {
            userID: user._id.toString(),
            teamID: new mongoose.Types.ObjectId().toString(),
            role: 'MEMBER',
        };

        const response = await request(app)
            .post('/superadmin/addUserToTeam')
            .set('Authorization', `Bearer ${token}`)
            .send(addUserRequest)
            .expect(400);

        expect(response.body.error).toBe('Team not found');
    });

    it('should return an error if the user is not found', async () => {
        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const team = await TestHelpers.createTestTeam('Test Team', superAdminUser._id, [], []);

        const token = await TestHelpers.generateToken(superAdminUser.userID, superAdminUser.email);

        const addUserRequest = {
            userID: new mongoose.Types.ObjectId().toString(),
            teamID: team._id.toString(),
            role: 'MEMBER',
        };

        const response = await request(app)
            .post('/superadmin/addUserToTeam')
            .set('Authorization', `Bearer ${token}`)
            .send(addUserRequest)
            .expect(400);

        expect(response.body.error).toBe('User not found');
    });

    it('should return an error if the user is not authorized', async () => {
        const addUserRequest = {
            userID: new mongoose.Types.ObjectId().toString(),
            teamID: new mongoose.Types.ObjectId().toString(),
            role: 'MEMBER',
        };

        const response = await request(app)
            .post('/superadmin/addUserToTeam')
            .send(addUserRequest)
            .expect(401);

        expect(response.body.error).toBe('Unauthorized: No token provided');
    });
});

describe('POST /superadmin/removeUserFromTeam', () => {
    it('should remove a user from a team successfully', async () => {
        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const team = await TestHelpers.createTestTeam('Test Team', superAdminUser._id, [], []);

        const token = await TestHelpers.generateToken(superAdminUser.userID, superAdminUser.email);

        const teamMember = await TestHelpers.createTestTeamMember(user._id, team._id, TeamRole.MEMBER, []);

        user.teamMemberships.push(teamMember._id);
        await user.save();

        team.teamMembers.push(teamMember._id);
        await team.save();

        const removeUserRequest = {
            userID: user.userID,
            teamID: team._id.toString(),
        };

        const response = await request(app)
            .post('/superadmin/removeUserFromTeam')
            .set('Authorization', `Bearer ${token}`)
            .send(removeUserRequest)
            .expect(200);
        expect(response.body.message).toBe('User removed from team successfully');
    });
});

describe('POST /superadmin/deleteTeam', ()    => {
    it('should delete a team successfully', async () => {
        const superAdminUser = await TestHelpers.createTestSuperAdmin([]);

        const user = await TestHelpers.createTestUser('user@user.com', 'testpassword', 'User', 'User', 'useruser', Role.USER, []);

        const team = await TestHelpers.createTestTeam('Test Team', superAdminUser._id, [], []);

        const token = await TestHelpers.generateToken(superAdminUser.userID, superAdminUser.email);

        const teamMember = await TestHelpers.createTestTeamMember(user._id, team._id, TeamRole.MEMBER, []);

        user.teamMemberships.push(teamMember._id);
        await user.save();

        team.teamMembers.push(teamMember._id);
        await team.save();

        const deleteTeamRequest = {
            teamID: team._id.toString(),
        };

        const response = await request(app)
            .post('/superadmin/deleteTeam')
            .set('Authorization', `Bearer ${token}`)
            .send(deleteTeamRequest)
            .expect(200);

        expect(response.body.message).toBe('Team deleted successfully');
        const foundTeam = await Team.findById(team._id);
        expect(foundTeam).toBeNull();
        const foundTeamMember = await TeamMember.findById(teamMember._id);
        expect(foundTeamMember).toBeNull();
        const updatedUser = await User.findById(user._id);
        expect(updatedUser!.teamMemberships).not.toContain(teamMember._id);
    });
});

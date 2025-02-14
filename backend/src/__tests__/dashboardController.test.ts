import request from 'supertest';
import express from 'express';
import dashboardRoutes from '../routes/dashboardRoutes';
import authenticate from '../middlewares/authMiddleware';
import checkPermission from '../middlewares/permissionMiddleware';
import { TeamRole } from '../enums';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Team from '../models/Team';
import Channel from '../models/Channel';
import TeamMember from '../models/TeamMember';

const app = express();
app.use(express.json());
app.use('/dashboard', authenticate, dashboardRoutes);

describe('GET /dashboard/listTeams', () => {
    it('should list all teams for the authenticated user', async () => {
        const user = new User({
            email: 'user@user.com',
            password: 'testpassword',
            firstName: 'User',
            lastName: 'User',
            userID: 'useruser',
            role: 'USER',
            teamMemberships: [],
        });
        await user.save();

        const team = new Team({
            name: 'Test Team',
            createdBy: user._id,
            teamMembers: [],
            channels: [],
        });
        await team.save();

        const teamMember = new TeamMember({
            user: user._id,
            team: team._id,
            role: TeamRole.MEMBER,
        }) as mongoose.Document & { _id: mongoose.Types.ObjectId };
        await teamMember.save();

        team.teamMembers.push(teamMember._id as unknown as mongoose.Schema.Types.ObjectId);
        await team.save();

        user.teamMemberships.push(teamMember._id as unknown as mongoose.Schema.Types.ObjectId);
        await user.save();

        const token = jwt.sign({ userID: user.userID, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });

        const response = await request(app)
            .get('/dashboard/listTeams')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0].name).toBe('Test Team');
    });

    it('should return an error if the user is not authenticated', async () => {
        const response = await request(app)
            .get('/dashboard/listTeams')
            .expect(401);

        expect(response.body.error).toBe('Unauthorized: No token provided');
    });
});

describe('GET /dashboard/listChannels', () => {
    it('should list all channels for the authenticated user in a team', async () => {
        const user = new User({
            email: 'user@user.com',
            password: 'testpassword',
            firstName: 'User',
            lastName: 'User',
            userID: 'useruser',
            role: 'USER',
        });
        await user.save();

        const team = new Team({
            name: 'Test Team',
            createdBy: user._id,
            teamMembers: [user._id],
            channels: [],
        });
        await team.save();

        const teamMember = new TeamMember({
            user: user._id,
            team: team._id,
            role: TeamRole.MEMBER,
            channels: [],
        });
        await teamMember.save();

        user.teamMemberships.push(teamMember._id as unknown as mongoose.Schema.Types.ObjectId);
        await user.save();

        const channel = new Channel({
            name: 'Test Channel',
            team: team._id,
            createdBy: user._id,
            members: [user._id],
        });
        await channel.save();

        team.channels.push(channel._id as unknown as mongoose.Schema.Types.ObjectId);
        await team.save();

        teamMember.channels.push(channel._id as unknown as mongoose.Schema.Types.ObjectId);
        await teamMember.save();

        const token = jwt.sign({ userID: user.userID, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });

        const response = await request(app)
            .get('/dashboard/listChannels')
            .set('Authorization', `Bearer ${token}`)
            .send({ team: team._id })
            .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0].name).toBe('Test Channel');
    });

    it('should return an error if the user is not authenticated', async () => {
        const response = await request(app)
            .get('/dashboard/listChannels')
            .expect(401);

        expect(response.body.error).toBe('Unauthorized: No token provided');
    });

    it('should return an error if the team is not found', async () => {
        const user = new User({
            email: 'user@user.com',
            password: 'testpassword',
            firstName: 'User',
            lastName: 'User',
            userID: 'useruser',
            role: 'USER',
        });
        await user.save();

        const token = jwt.sign({ userID: user.userID, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });

        const response = await request(app)
            .get('/dashboard/listChannels')
            .set('Authorization', `Bearer ${token}`)
            .send({ team: new mongoose.Types.ObjectId().toString() })
            .expect(404);

        expect(response.body.error).toBe('Team not found');
    });
});
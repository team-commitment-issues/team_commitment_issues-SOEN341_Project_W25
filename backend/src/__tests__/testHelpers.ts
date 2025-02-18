import User from '../models/User';
import mongoose from 'mongoose';
import { Role, TeamRole } from '../enums';
import Team from '../models/Team';
import Channel from '../models/Channel';
import jwt from 'jsonwebtoken';
import TeamMember from '../models/TeamMember';
import bcrypt from 'bcrypt';
import { Message } from '../models/Message';

class TestHelpers {
    static async createTestSuperAdmin(teamMemberships: mongoose.Types.ObjectId[]): Promise<any> {
        const superAdminUser = new User({
            email: 'superadmin@user.com',
            password: 'testpassword',
            firstName: 'Super',
            lastName: 'Admin',
            userID: 'superadminuser',
            role: Role.SUPER_ADMIN,
            teamMemberships,
        });
        await superAdminUser.save();
        return superAdminUser;
    }

    static async createTestUser(email: string, password: string, firstName: string, lastName: string, userID: string, role: Role, teamMemberships: mongoose.Types.ObjectId[]): Promise<any> {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            userID,
            role,
            teamMemberships,
        });
        await user.save();
        return user;
    }

    static async createTestTeam(name: string, createdBy: mongoose.Types.ObjectId, teamMembers: mongoose.Types.ObjectId[], channels: mongoose.Types.ObjectId[]): Promise<any> {
        const team = new Team({
            name,
            createdBy,
            teamMembers,
            channels,
        });
        await team.save();
        return team;
    }

    static async createTestChannel(name: string, team: mongoose.Types.ObjectId, createdBy: mongoose.Types.ObjectId, members: mongoose.Types.ObjectId[], messages: mongoose.Types.ObjectId[]): Promise<any> {
        const channel = new Channel({
            name,
            team,
            createdBy,
            members,
            messages,
        });
        await channel.save();
        return channel;
    }

    static async generateToken(userID: string, email:string): Promise<string> {
        return jwt.sign({ userID, email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    }

    static async createTestTeamMember(user: mongoose.Types.ObjectId, team: mongoose.Types.ObjectId, role: TeamRole, channels: mongoose.Types.ObjectId[]): Promise<any> {
        const teamMember = new TeamMember({
            user,
            team,
            role,
            channels,
        });
        await teamMember.save();
        return teamMember;
    }

    static async createTestMessage(text: string, user: mongoose.Types.ObjectId, channel: mongoose.Types.ObjectId): Promise<any> {
        const message = new Message({
            text,
            user,
            channel
        });
        await message.save();
        return message;
    }
}

export default TestHelpers;
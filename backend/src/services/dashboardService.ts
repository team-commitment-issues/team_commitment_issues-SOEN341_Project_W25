import Team from '../models/Team';
import Channel from '../models/Channel';
import User from '../models/User';
import { Schema, Types } from 'mongoose';
import { Role } from '../enums';
import TeamMember from '../models/TeamMember';

class DashboardService {
    static async listTeams(role: Role, teamMemberships: Schema.Types.ObjectId[]): Promise<any> {
        if (role === Role.SUPER_ADMIN) {
            const teams = await Team.find().select('name');
            return teams;
        }
        const teams = [];
        for (const teamMemberId of teamMemberships) {
            const teamMember = await TeamMember.findOne({ _id: teamMemberId }).select('team');
            const team = await Team.findOne({ _id: (teamMember!.team) }).select('name');
            teams.push(team!);
        }

        return teams;
    }

    static async listChannels(role: Role, team: Types.ObjectId, teamMember: Types.ObjectId | null): Promise<any> {
        if (role === Role.SUPER_ADMIN) {
            const channels = await Channel.find({ team: team }).select('name');
            return channels;
        }

        const channels = await Channel.find({ team: team, members: teamMember }).select('name');
        return channels;
    }

    static async listUsers(username: string): Promise<any> {
        const users = (await User.find().select('username')).filter((user) => user.username !== username);
        return users;
    }

    static async listTeamUsers(team: Types.ObjectId): Promise<any> {
        const teamData = await Team.findOne({ _id: team }).select('teamMembers');
        if (!teamData) return [];
        const userIds = await TeamMember.find({ _id: { $in: teamData.teamMembers } }).distinct('user');
        const usernames = await User.find({ _id: { $in: userIds } }).select('username -_id');
        return usernames;
    }

    static async listChannelUsers(channel: Types.ObjectId): Promise<any> {
        const channelData = await Channel.findOne({ _id: channel }).select('members');
        if (!channelData) return [];
        const userIds = await TeamMember.find({ _id: { $in: channelData.members } }).distinct('user');
        const usernames = await User.find({ _id: { $in: userIds } }).select('username -_id');
        return usernames;
    }
}

export default DashboardService;
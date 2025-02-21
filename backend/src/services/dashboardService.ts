import Team from '../models/Team';
import Channel from '../models/Channel';
import User from '../models/User';
import { Schema, Types } from 'mongoose';
import { Role } from '../enums';
import TeamMember from '../models/TeamMember';

class DashboardService {
    static async listTeams(role: Role, teamMemberships: Schema.Types.ObjectId[]): Promise<any> {
        if (role === Role.SUPER_ADMIN) {
            const teamNames = await Team.find().select('name');
            return teamNames;
        }
        const teamNames = [];
        for (const teamMemberId of teamMemberships) {
            const teamMember = await TeamMember.findOne({ _id: teamMemberId }).select('team');
            const team = await Team.findOne({ _id: (teamMember!.team) }).select('name');
            teamNames.push(team!.name);
        }

        return teamNames;
    }

    static async listChannels(role: Role, team: Types.ObjectId, teamMember: Types.ObjectId): Promise<any> {
        if (role === Role.SUPER_ADMIN) {
            const channels = await Channel.find({ team: team });
            return channels;
        }

        const channels = await Channel.find({ team: team, members: teamMember }).select('name');
        const channelNames = channels.map((channel) => ({ name: channel.name }));
        return channelNames;
    }

    static async listUsers(username: string): Promise<any> {
        const users = (await User.find()).filter((user) => user.username !== username).map((user) => ({ username: user.username }));
        return users;
    }

    static async listTeamUsers(team: Types.ObjectId): Promise<any> {
        const teamMembers = await TeamMember.find({ team: team }).populate('user').select('user');
        const usernames = (await User.find({ _id: { $in: teamMembers } })).map((user) => ({ username: user.username }));
        
        return usernames;
    }

    static async listChannelUsers(channel: Types.ObjectId): Promise<any> {
        const channelMembers = await Channel.findOne({ _id: channel }).populate('members').select('members');
        const usernames = (await User.find({ _id: { $in: channelMembers } })).map((user) => ({ username: user.username }));
        return usernames;
    }
}

export default DashboardService;
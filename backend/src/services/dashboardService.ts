import Team from '../models/Team';
import Channel from '../models/Channel';
import User from '../models/User';
import { Schema, Types } from 'mongoose';
import { Role } from '../enums';
import TeamMember from '../models/TeamMember';

class DashboardService {
    static async listTeams(userID: string): Promise<any> {
        const user = await User.findOne({ userID }).populate('teamMemberships');
        if (!user) {
            throw new Error('User not found');
        }

        const teamIDs = user.teamMemberships.map((membership: any) => membership.team);

        const teams = await Team.find({ _id: { $in: teamIDs } });
        return teams;
    }

    static async listChannels(userID: string, teamID: string): Promise<any> {
        const user = await User.findOne({ userID }).populate('teamMemberships');
        if (!user) {
            throw new Error('User not found');
        }

        const team = await Team.findById(teamID);
        if (!team) {
            throw new Error('Team not found');
        }

        if (user.role === Role.SUPER_ADMIN) {
            const channels = await Channel.find({ team: teamID });
            return channels;
        }

        const teamMembership = await TeamMember.findOne({ user: user._id, team: teamID }).populate('channels');
        if (!teamMembership) {
            throw new Error('User is not a member of the specified team');
        }

        const channels = await Channel.find({ _id: { $in: teamMembership.channels.map((channel: any) => channel._id) } });
        return channels;
    }
}

export default DashboardService;
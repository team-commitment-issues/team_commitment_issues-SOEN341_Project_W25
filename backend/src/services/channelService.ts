import Channel from '../models/Channel';
import Team from '../models/Team';
import User from '../models/User';
import TeamMember from '../models/TeamMember';
import { Schema, Types } from 'mongoose';

class ChannelService {
    static async createChannel(name: string, createdByUserID: string, teamName: string): Promise<any> {
        const user = await User.findOne({ userID: createdByUserID });
        if (!user) {
            throw new Error('User not found');
        }

        const teamExists = await Team.findOne({ name: teamName });
        if (!teamExists) {
            throw new Error('Team not found');
        }

        const channel = new Channel({ name, createdBy: user._id, team: teamExists._id });
        await channel.save();

        if (user.role !== 'SUPER_ADMIN') {
            await ChannelService.addUserToChannel(channel.name, user.userID);
        }

        return await channel.save();
    }

    static async addUserToChannel(channelName: string, userID: string): Promise<any> {
        const user = await User.findOne({ userID });
        if (!user) {
            throw new Error('User not found');
        }

        const channel = await Channel.findOne({ name: channelName });
        if (!channel) {
            throw new Error('Channel not found');
        }

        const team = await Team.findById(channel.team);
        if (!team) {
            throw new Error('Team not found');
        }

        const teamMember = await TeamMember.findOne({ team: team._id, user: user._id });
        if (!teamMember) {
            throw new Error('User not a member of the team');
        }

        team.channels.push(channel._id as Schema.Types.ObjectId);
        await team.save();
        channel.members.push(user._id as Schema.Types.ObjectId);
        return await channel.save();
    }
}

export default ChannelService;
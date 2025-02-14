import Channel from '../models/Channel';
import Team from '../models/Team';
import User from '../models/User';
import TeamMember from '../models/TeamMember';
import { Schema, Types } from 'mongoose';

class ChannelService {
    static async createChannel(name: string, createdByUserID: string, team: string): Promise<any> {
        const user = await User.findOne({ userID: createdByUserID });
        if (!user) {
            throw new Error('User not found');
        }

        const channel = new Channel({ name, createdBy: user._id, team });
        await channel.save();

        await ChannelService.addUserToChannel(channel._id as Types.ObjectId, user.userID);

        return await channel.save();
    }

    static async addUserToChannel(channelID: Types.ObjectId, userID: string): Promise<any> {
        const user = await User.findOne({ userID });
        if (!user) {
            throw new Error('User not found');
        }

        const channel = await Channel.findById(channelID);
        if (!channel) {
            throw new Error('Channel not found');
        }

        const team = await Team.findById(channel.team);
        if (!team) {
            throw new Error('Team not found');
        }

        const teamMember = team.teamMembers.find((member: any) => member.equals(user._id));

        if (!teamMember) {
            throw new Error('User not a member of the team');
        }

        await TeamMember.updateOne({ team: team._id, user: user._id }, { $push: { channels: channel._id } });
        
        await Channel.updateOne({ _id: channel._id }, { $push: { members: user._id } });
        return await channel.save();
    }
}

export default ChannelService;
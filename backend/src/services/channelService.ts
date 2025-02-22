import Channel from '../models/Channel';
import Team from '../models/Team';
import User from '../models/User';
import TeamMember from '../models/TeamMember';
import { Schema, Types } from 'mongoose';
import { Message } from '../models/Message';
import { Role } from '../enums';

class ChannelService {
    static async createChannel(team: Types.ObjectId, channelName: string, createdBy: Types.ObjectId, username: string, role: Role, selectedTeamMembers: string[]): Promise<any> {
        if (await Channel.findOne({ name: channelName })) {
            throw new Error('Channel already exists');
        }
        const channel = new Channel({ name: channelName, createdBy: createdBy, team: team });
        await channel.save();

        if (role !== 'SUPER_ADMIN') {
            await ChannelService.addUserToChannel(team, channel.name, username);
        }

        for (const member of selectedTeamMembers) {
            await ChannelService.addUserToChannel(team, channel.name, member);
        }
        return (await channel.save());
    }

    static async addUserToChannel(team: Types.ObjectId, channelName: string, username: string): Promise<any> {
        const userToAdd = await User.findOne({ username });
        if (!userToAdd) {
            throw new Error('User not found');
        }

        const teamMember = await TeamMember.findOne({ user: userToAdd._id, team: team });
        if (!teamMember) {
            throw new Error('User not a member of the team');
        }

        const channel = await Channel.findOne({ name: channelName });
        if (!channel) {
            throw new Error('Channel not found');
        }

        const channelTeam = await Team.findById(channel.team);
        if (!channelTeam) {
            throw new Error('Team not found');
        }
        
        channelTeam.channels.push(channel._id as Schema.Types.ObjectId);
        await channelTeam.save();
        channel.members.push(teamMember._id as Schema.Types.ObjectId);
        await channel.save();
        teamMember.channels.push(channel._id as Schema.Types.ObjectId);
        console.log(channel);
        return await teamMember.save();
    }

    static async sendMessage(channel: Types.ObjectId, teamMember: Types.ObjectId, text: string): Promise<any> {
        const selectedChannel = await Channel.findById(channel);
        if (!selectedChannel) {
            throw new Error('Channel not found');
        }
        const member = await TeamMember.findById(teamMember);
        if (!member) {
            throw new Error('Team member not found');
        }
        const user = member.user;
        const message = new Message({ text, user, channel, createdAt: new Date() });
        await message.save();

        selectedChannel.messages.push(message._id as Schema.Types.ObjectId);
        return await selectedChannel.save();
    }

    static async deleteChannel(teamId: Types.ObjectId, channelId: Types.ObjectId): Promise<any> {
        const team = await Team.findById(teamId);
        if (!team) {
            throw new Error('Team not found');
        }

        const channel = await Channel.findById(channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }

        team.channels = team.channels.filter((c) => c !== channel._id);
        await team.save();

        const teamMembers = await TeamMember.find({ team: team._id });
        for (const member of teamMembers) {
            member.channels = member.channels.filter((c) => c !== channel._id);
            await member.save();
        }

        await Message.deleteMany({ channel: channel._id });
        return await channel.deleteOne();
    }

    static async getMessages(channel: Types.ObjectId): Promise<any> {
        const messages = await Message.find({ channel: channel });
        return messages;
    }
}

export default ChannelService;
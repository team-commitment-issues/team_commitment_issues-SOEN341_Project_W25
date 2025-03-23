import Channel from '../models/Channel';
import Team from '../models/Team';
import User from '../models/User';
import TeamMember from '../models/TeamMember';
import { Schema, Types } from 'mongoose';
import { Message } from '../models/Message';
import { Role } from '../enums';
import { get } from 'http';

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
        const userToAdd = await User.findOne({ username: { $eq: username } });
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
        return await teamMember.save();
    }

    static async removeUserFromChannel(team: Types.ObjectId, channelName: string, username: string, userRole: string): Promise<any> {
        const userToRemove = await User.findOne({ username: { $eq: username } });
        if (!userToRemove) {
            throw new Error('User not found');
        }

        const teamMember = await TeamMember.findOne({ user: userToRemove._id, team: team });
        if (!teamMember) {
            throw new Error('User not a member of the team');
        }

        // userRole is the role of the user making the request
        if (teamMember.role === 'ADMIN' && userRole !== 'SUPER_ADMIN') {
            throw new Error('Not authorized to remove user from channel');
        }

        const channel = await Channel.findOne({ name: channelName });
        if (!channel) {
            throw new Error('Channel not found');
        }

        channel.members = channel.members.filter((memberId) => String(memberId) !== String(teamMember._id));
        await channel.save();

        teamMember.channels = teamMember.channels.filter((channelId) => String(channelId) !== String(channel._id));
        return await teamMember.save();
    }

    static async sendMessage(channel: Types.ObjectId, teamMember: Types.ObjectId | string, text: string): Promise<any> {
        const selectedChannel = await Channel.findById(channel);
        if (!selectedChannel) {
            throw new Error('Channel not found');
        }
        if (typeof teamMember === 'string') {
            const message = new Message({ text, username: teamMember, channel, createdAt: new Date() });
            await message.save();
            selectedChannel.messages.push(message._id as Schema.Types.ObjectId);
            await Channel.findByIdAndUpdate(channel, { $push: { messages: message._id } }, { new: true });
            return message;
        }
        const member = await TeamMember.findById(teamMember);
        if (!member) {
            throw new Error('Team member not found');
        }
        const user = await User.findById(member.user).select('username');
        if (!user) {
            throw new Error('User not found');
        }
        const message = new Message({ text, username: user.username, channel, createdAt: new Date() });
        await message.save();

        selectedChannel.messages.push(message._id as Schema.Types.ObjectId);
        await Channel.findByIdAndUpdate(channel, { $push: { messages: message._id } }, { new: true });
        return message;
    }

    static async deleteMessage(channel: Types.ObjectId, messageId: Schema.Types.ObjectId): Promise<any> {
        const message = await Message.findOne({ _id: { $eq: messageId } });
        if (!message) {
            throw new Error('Message not found');
        }

        const channelData = await Channel.findById(channel);
        if (!channelData) {
            throw new Error('Channel not found');
        }

        if (!channelData.messages.includes(messageId)) {
            throw new Error('Message not found');
        }

        channelData.messages = channelData.messages.filter((id) => String(id) !== String(message._id));
        await channelData.save();

        return await message.deleteOne();
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

    static async updateMessageStatus(messageId: string, status: string): Promise<void> {
        const result = await Channel.updateOne(
            { "messages._id": messageId },
            { "$set": { "messages.$.status": status } }
        );

        if (result.modifiedCount === 0) {
            throw new Error(`Message ${messageId} not found or status already set to ${status}`);
        }
    }

    static async getMessagesByCriteria(criteria: any, limit: number): Promise<any[]> {
        const channel = await Channel.findOne(
          { _id: criteria.channel }
        ).exec();
      
        if (!channel) {
          return [];
        }
        
        // Create message query
        let query: any = { channel: channel._id };
        
        // Add _id constraint if "before" parameter is provided
        if (criteria._id) {
          query._id = criteria._id;
        }
      
        // Get messages sorted chronologically (oldest to newest)
        const messages = await Message.find(query)
          .sort({ createdAt: 1 }) // Changed from -1 to 1
          .limit(limit)
          .exec();
      
        return messages;
      }

    static async leaveChannel(teamName: string, channelName: string, userId: Types.ObjectId): Promise<any> {
        const team = await Team.findOne({name: {$eq: teamName}});
        if (!team) {
            throw new Error('Team not found');
        }

        const channelData = await Channel.findOne({name: {$eq: channelName}});
        if (!channelData) {
            throw new Error('Channel not found');
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const teamMember = await TeamMember.findOne({ user: user._id, team: team._id });
        if (!teamMember) {
            throw new Error('User is not a member of the team');
        }

        teamMember.channels = teamMember.channels.filter((c) => String(c) !== String(channelData._id));
        await teamMember.save();

        channelData.members = channelData.members.filter((m) => String(m) !== String(teamMember._id));
        await channelData.save();

        return channelData;
    }
}

export default ChannelService;
import { Types } from 'mongoose';
import Channel from '../models/Channel';
import User from '../models/User';

class ChannelService {
  static async createChannel(name: string, description: string, userId: string) {
    const creator = await User.findOne({ userID: userId });
    if (!creator) {
      throw new Error('User not found');
    }

    const newChannel = new Channel({
      name,
      description,
      members: [{ user: creator._id, role: 'admin' }],
    });

    return await newChannel.save();
  }

  static async addUserToChannel(channelId: string, userId: string, role: 'admin' | 'member') {
    const channel = await Channel.findById(channelId).exec();
    const user = await User.findOne({ userID: userId });

    if (!channel || !user) {
      throw new Error('Channel or user not found');
    }

    if (channel.members.some( member => member.user === user._id)) {
      throw new Error('User is already a member of this channel');
    }
    
    channel.members.push({ user: (user._id as Types.ObjectId), role });
    return await channel.save();
  }

    static async getChannelsByUser(userId: string) {
        return await Channel.find({ 'members.user': userId });
    }
}

export default ChannelService;

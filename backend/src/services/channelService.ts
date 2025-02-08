import Channel from '../models/Channel';
import User from '../models/User';
import { Role } from '../enums';

class ChannelService {
    static async createChannel(name: string, createdByUserID: string): Promise<any> {
        const user = await User.findOne({ userID: createdByUserID });
        if (!user || user.role !== Role.ADMIN) {
            throw new Error('User not found or not an admin');
        }

        const channel = new Channel({ name, createdBy: user._id });
        return await channel.save();
    }
}

export default ChannelService;
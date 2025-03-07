import Team from '../models/Team';
import User from '../models/User';
import TeamMember from '../models/TeamMember';
import { Schema, Types } from 'mongoose';
import DMessage from '../models/DMessage';
import { Role } from '../enums';
import DirectMessage from '../models/DirectMessage';

class DirectMessageService {
    static async createDirectMessage(username: string, teamMember: Schema.Types.ObjectId, team: Schema.Types.ObjectId) {
            const receiver = await User.findOne({ username: username });
            if (!receiver) {
                throw new Error('User not found');
            }
            const receiverTeamMember = await TeamMember.findOne({ user: receiver._id, team });
            if (!receiverTeamMember) {
                throw new Error('Team member not found');
            }
            const teamMembers = [teamMember, receiverTeamMember._id];
            if (await DirectMessage.findOne({ teamMembers: { $all: teamMembers } })) {
                throw new Error('Direct message already exists');
            }
            const directMessage = new DirectMessage({
                teamMembers: teamMembers,
                dmessages: [],
            });
            await directMessage.save();
            return directMessage;
    }

    static async getDirectMessages(directMessageId: Types.ObjectId) {
        const messages = await DMessage.find({ directMessageId });
        return messages;
    }

    static async sendDirectMessage(directMessageId: Types.ObjectId, dmessage: string, senderId: Schema.Types.ObjectId) {
        const directMessage = await DirectMessage.findById(directMessageId);
        if (!directMessage) {
            throw new Error('Direct message not found');
        }

        const newDMessage = new DMessage({
            directMessage: directMessage._id,
            dmessage,
            senderId,
        });
        await newDMessage.save();
        directMessage.dmessages.push(newDMessage._id as Schema.Types.ObjectId);
        await directMessage.save();
        return newDMessage;
    }
}

export default DirectMessageService;
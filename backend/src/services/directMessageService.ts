import Team from '../models/Team';
import User from '../models/User';
import TeamMember from '../models/TeamMember';
import { Schema, Types } from 'mongoose';
import DMessage from '../models/DMessage';
import { Role } from '../enums';
import DirectMessage from '../models/DirectMessage';

class DirectMessageService {
    static async createDirectMessage(teamMembers: string[]) {
        try {
            const teamMember1 = await TeamMember.findOne({ userId: teamMembers[0] });
            const teamMember2 = await TeamMember.findOne({ userId: teamMembers[1] });
            if (!teamMember1 || !teamMember2) {
                throw new Error('Team members not found');
            }
            if (await DirectMessage.findOne({ teamMembers: { $all: teamMembers } })) {
                throw new Error('Direct message already exists');
            }
            const directMessage = new DirectMessage({
                teamMembers: [teamMember1._id, teamMember2._id],
                messages: [],
            });
            await directMessage.save();
            return directMessage;
        } catch (error) {
            throw new Error('Internal server error');
        }
    }

    static async getDirectMessages(directMessageId: Types.ObjectId) {
        const messages = await DMessage.find({ directMessageId });
        return messages;
    }

    static async sendDirectMessage(directMessageId: Types.ObjectId, dmessage: string) {
        const directMessage = await DirectMessage.findById(directMessageId);
        if (!directMessage) {
            throw new Error('Direct message not found');
        }

        const newDMessage = new DMessage({
            directMessage: directMessage._id,
            dmessage,
            senderId: directMessage.teamMembers[0],
        });
        await newDMessage.save();
        directMessage.dmessages.push(newDMessage._id as Schema.Types.ObjectId);
        await directMessage.save();
        return newDMessage;
    }
}

export default DirectMessageService;
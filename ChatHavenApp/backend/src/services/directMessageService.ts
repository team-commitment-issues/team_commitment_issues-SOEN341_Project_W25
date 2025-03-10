import Team from '../models/Team';
import User from '../models/User';
import TeamMember from '../models/TeamMember';
import { Schema, Types } from 'mongoose';
import DMessage from '../models/DMessage';
import { Role } from '../enums';
import DirectMessage from '../models/DirectMessage';

class DirectMessageService {
    static async createDirectMessage(username: string, teamMember: Schema.Types.ObjectId, team: Schema.Types.ObjectId) {       
        if (typeof username !== 'string') {
                    throw new Error('Invalid username');
                }
                const receiver = await User.findOne({ username: { $eq: username } });
                if (!receiver) {
                    throw new Error('User not found');
                }
                const receiverTeamMember = await TeamMember.findOne({ user: receiver._id, team });
                if (!receiverTeamMember) {
                    throw new Error('Team member not found');
                }
                const teamMember1 = await TeamMember.findById(teamMember);
                if (!teamMember1) {
                    throw new Error('Team member not found');
                }
                const teamMembers = [teamMember, receiverTeamMember._id];
                if (await DirectMessage.findOne({ teamMembers: { $all: teamMembers } })) {
                    throw new Error('Direct message already exists');
                }
                const directMessage = new DirectMessage({
                    teamMembers: [teamMember1._id, receiverTeamMember._id],
                    dmessages: [],
                });
                await directMessage.save();
                console.log(directMessage);
                return directMessage;
    }

    static async getDirectMessages(directMessageId: Types.ObjectId) {
        const directMessage = await DirectMessage.findById(directMessageId);
        if (!directMessage) {
            throw new Error('Direct message not found');
        }
        const dmessages = await DMessage.find({ directMessage: directMessageId });
        return dmessages;
    }

    static async sendDirectMessage(text: string, username: string, directMessageId: Types.ObjectId) {
        const directMessage = await DirectMessage.findById(directMessageId);
        if (!directMessage) {
            throw new Error('Direct message not found');
        }
        const newDMessage = new DMessage({
            text,
            username,
            directMessage: directMessageId,
            createdAt: new Date(),
        });
        await newDMessage.save();
        directMessage.dmessages.push(newDMessage._id as Schema.Types.ObjectId);
        await directMessage.save();
        return newDMessage;
    }
}

export default DirectMessageService;
import Team from '../models/Team';
import User from '../models/User';
import TeamMember from '../models/TeamMember';
import { Schema, Types } from 'mongoose';
import DMessage from '../models/DMessage';
import { Role } from '../enums';
import DirectMessage, { IDirectMessage } from '../models/DirectMessage';

class DirectMessageService {
    /**
     * #### Creates a direct message between the sender and the receiver identified by the username.
     * 
     * @param username - The username of the receiver.
     * @param sender - The ObjectId of the sender.
     * @param team - The ObjectId of the team.
     * @returns `Promise<DirectMessage>` The created direct message. See {@link DirectMessage}.
     * @remarks If the receiver is not a SUPER_ADMIN, the receiver must be a team member of the team.
     * 
     * ***
     * #### Exceptions
     * @throws `Invalid username` when the username is not a string.
     * @throws `User not found` when the receiver is not found.
     * @throws `Team member not found` when the receiver is not a team member.
     * @throws `Direct message already exists` when the direct message already exists.
     */
    static async createDirectMessage(username: string, sender: Schema.Types.ObjectId, team: Schema.Types.ObjectId)  {       
        if (typeof username !== 'string') {
                    throw new Error('Invalid username');
                }
                const receiver = await User.findOne({ username: { $eq: username } });
                if (!receiver) {
                    throw new Error('User not found');
                }
                if (receiver.role !== Role.SUPER_ADMIN) {
                    const receiverTeamMember = await TeamMember.findOne({ user: receiver._id, team });
                    if (!receiverTeamMember) {
                        throw new Error('Team member not found');
                    }   
                }
                const users = [receiver._id, sender];
                if (await DirectMessage.findOne({ users: { $all: users } })) {
                    throw new Error('Direct message already exists');
                }
                const directMessage = new DirectMessage({
                    users,
                    dmessages: [],
                });
                await directMessage.save();
                return directMessage;
    }

    /**
     * #### Retrieves direct messages associated with a given direct message ID.
     *
     * @param directMessageId - The ID of the direct message to retrieve.
     * @returns `Promise<DMessage[]>` A promise that resolves to an array of direct messages. See {@link DMessage}.
     * ***
     * @throws `Direct message not found` when the direct message is not found.
     */
    static async getDirectMessages(directMessageId: Types.ObjectId) {
        const directMessage = await DirectMessage.findById(directMessageId);
        if (!directMessage) {
            throw new Error('Direct message not found');
        }
        const dmessages = await DMessage.find({ directMessage: directMessageId });
        return dmessages;
    }

    /**
     * #### Sends a direct message to a user in a direct message.
     * 
     * @param text - The text of the direct message.
     * @param username - The username of the sender.
     * @param directMessageId - The ID of the direct message.
     * @returns `Promise<DMessage>` The created direct message. See {@link DMessage}.
     * ***
     * @throws `Direct message not found` when the direct message is not found.
     */
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
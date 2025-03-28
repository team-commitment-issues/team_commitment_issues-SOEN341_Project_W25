import User from '../models/User';
import TeamMember from '../models/TeamMember';
import { Schema, Types } from 'mongoose';
import DMessage, { IDMessage } from '../models/DMessage';
import { Role } from '../enums';
import DirectMessage from '../models/DirectMessage';

class DirectMessageService {
  /**
   * Creates a direct message between the sender and the receiver identified by the username.
   */
  static async createDirectMessage(
    username: string,
    sender: Schema.Types.ObjectId,
    team: Schema.Types.ObjectId
  ) {
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
      dmessages: []
    });
    await directMessage.save();
    return directMessage;
  }

  /**
   * Retrieves direct messages associated with a given direct message ID.
   */
  static async getDirectMessages(directMessageId: Types.ObjectId): Promise<IDMessage[]> {
    const directMessage = await DirectMessage.findById(directMessageId);
    if (!directMessage) {
      throw new Error('Direct message not found');
    }
    const dmessages = await DMessage.find({ directMessage: directMessageId });
    return dmessages;
  }

  /**
   * Sends a direct message to a user in a direct message.
   */
  static async sendDirectMessage(
    text: string,
    username: string,
    directMessageId: Types.ObjectId,
    fileInfo?: {
      fileName: string;
      fileType: string;
      fileUrl: string;
      fileSize?: number;
    },
    quotedMessage?: {
      _id: string;
      text: string;
      username: string;
    }
  ): Promise<IDMessage> {
    const directMessage = await DirectMessage.findById(directMessageId);
    if (!directMessage) {
      throw new Error('Direct message not found');
    }
    const newDMessage = new DMessage({
      text,
      username,
      directMessage: directMessageId,
      createdAt: new Date(),
      status: 'sent', // Initialize with sent status
      ...fileInfo && {
        fileName: fileInfo.fileName,
        fileType: fileInfo.fileType,
        fileUrl: fileInfo.fileUrl,
        fileSize: fileInfo.fileSize
      },
      ...quotedMessage && {
        quotedMessage: {
          _id: quotedMessage._id,
          text: quotedMessage.text,
          username: quotedMessage.username
        }
      }
    });
    await newDMessage.save();
    directMessage.dmessages.push(newDMessage._id as Schema.Types.ObjectId);
    await directMessage.save();
    return newDMessage;
  }

  /**
   * Updates the status of a direct message
   */
  static async updateMessageStatus(messageId: string, status: string): Promise<void> {
    // Update in the DMessage collection directly
    const result = await DMessage.updateOne({ _id: messageId }, { $set: { status: status } });

    if (result.modifiedCount === 0) {
      throw new Error(`Message ${messageId} not found or status already set to ${status}`);
    }
  }

  /**
   * Gets messages based on criteria for pagination
   */
  static async getMessagesByCriteria(criteria: any, limit: number): Promise<any[]> {
    // Get direct message document
    const directMessage = await DirectMessage.findById(criteria.directMessage).exec();

    if (!directMessage) {
      return [];
    }

    // Query DMessage collection with directMessage ID and any additional criteria
    const query: { directMessage: Types.ObjectId; _id?: Types.ObjectId } = {
      directMessage: criteria.directMessage
    };

    // Add _id constraint if "before" parameter is provided for pagination
    if (criteria._id) {
      query._id = criteria._id;
    }

    // Get messages with sorting - IMPORTANT: sort by createdAt in ASCENDING order
    // This matches the expected order in the frontend
    const messages = await DMessage.find(query)
      .sort({ createdAt: 1 }) // Changed from -1 to 1 for chronological order
      .limit(limit)
      .exec();

    return messages;
  }
}

export default DirectMessageService;

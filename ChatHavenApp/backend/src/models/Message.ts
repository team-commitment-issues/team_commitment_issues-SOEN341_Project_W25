import { Document, Schema, model } from 'mongoose';

const QuotedMessageSchema = new Schema({
  _id: { type: String, required: true },
  text: { type: String, required: true },
  username: { type: String, required: true }
});

/**
 * Interface representing a Message document in MongoDB.
 * @interface IMessage
 * @extends Document
 */
interface IMessage extends Document {
  /**
   * The text of the message.
   * @type {string}
   */
  text: string;
  /**
   * The username of the user who sent the message.
   * @type {string}
   * @see {@link User}
   */
  username: string;
  /**
   * The channel that the message belongs to.
   * @type {Schema.Types.ObjectId}
   * @see {@link Channel}
   */
  channel: Schema.Types.ObjectId;
  /**
   * The date and time the message was sent.
   * @type {Date}
   */
  createdAt: Date;

  editedBy?: string;
  editedAt?: Date;

  fileName?: string;
  fileType?: string;
  fileUrl?: string;
  fileSize?: number;
  quotedMessage?: {
    _id: string;
    text: string;
    username: string;
  };
}

/**
 * Mongoose schema for the Message collection.
 * @const {Schema<IMessage>}
 */
const MessageSchema = new Schema<IMessage>({
  text: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  channel: {
    type: Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  editedBy: {
    type: String
  },
  editedAt: {
    type: Date
  },
  fileName: {
    type: String
  },
  fileType: {
    type: String
  },
  fileUrl: {
    type: String
  },
  fileSize: {
    type: Number
  },
  quotedMessage: {
    type: QuotedMessageSchema
  }
});

/**
 * Mongoose model for the Message collection.
 * @type {Model<IMessage>}
 * @see {@link IMessage}
 */
const Message = model<IMessage>('Message', MessageSchema);

export { Message };
export type { IMessage };

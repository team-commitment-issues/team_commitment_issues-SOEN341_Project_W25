import { Document, Schema, model } from 'mongoose';

const QuotedMessageSchema = new Schema({
  _id: { type: String, required: true },
  text: { type: String, required: true },
  username: { type: String, required: true }
});

/**
 * Interface representing a DMessage document in MongoDB.
 * @interface IDMessage
 * @extends Document
 */
export interface IDMessage extends Document {
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
   * The DirectMessage that the message belongs to.
   * @type {Schema.Types.ObjectId}
   * @see {@link DirectMessage}
   */
  directMessage: Schema.Types.ObjectId;
  /**
   * The date and time the message was sent.
   * @type {Date}
   */
  createdAt: Date;
  status: string;
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
 * Mongoose schema for the DMessage collection.
 * @const {Schema<IDMessage>}
 */
const DMessageSchema = new Schema<IDMessage>({
  text: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  directMessage: {
    type: Schema.Types.ObjectId,
    ref: 'DirectMessage',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'sent'
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
 * Mongoose model for the DMessage collection.
 * @const {Model<IDMessage>}
 * @see {@link IDMessage}
 */
const DMessage = model<IDMessage>('DMessage', DMessageSchema);
export default DMessage;

import { Document, Schema, model } from 'mongoose';

/**
 * Interface representing a DirectMessage document in MongoDB.
 * @interface IDirectMessage
 * @extends Document
 */
interface IDirectMessage extends Document {
    /**
     * The teamMembers that the direct message is between.
     * @type {Schema.Types.ObjectId[]}
     * @see {@link TeamMember}
     */
    teamMembers: Schema.Types.ObjectId[];
    /**
     * The messages in the direct message.
     * @type {Schema.Types.ObjectId[]}
     * @see {@link Message}
    */
    messages: Schema.Types.ObjectId[];
}

/**
 * Mongoose schema for the DirectMessage collection.
 * @const {Schema<IDirectMessage>}
 */
const DirectMessageSchema = new Schema<IDirectMessage>({
    teamMembers: [{
        type: Schema.Types.ObjectId,
        ref: 'TeamMember',
        required: true,
    }],
    messages: [{
        type: Schema.Types.ObjectId,
        ref: 'Message',
    }],
});

/**
 * Mongoose model for the DirectMessage collection.
 * @const {Model<IDirectMessage>}
 * @see {@link IDirectMessage}
*/
const DirectMessage = model<IDirectMessage>('DirectMessage', DirectMessageSchema);
export default DirectMessage;
export { IDirectMessage };
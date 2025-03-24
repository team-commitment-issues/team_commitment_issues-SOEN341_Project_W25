import { Document, Schema, model } from 'mongoose';

/**
 * Interface representing a DirectMessage document in MongoDB.
 * @interface IDirectMessage
 * @extends Document
 */
interface IDirectMessage extends Document {
    /**
     * The users that the direct message is between.
     * @type {Schema.Types.ObjectId[]}
     * @see {@link User}
     */
    users: Schema.Types.ObjectId[];
    /**
     * The dmessages in the direct message.
     * @type {Schema.Types.ObjectId[]}
     * @see {@link DMessage}
    */
    dmessages: Schema.Types.ObjectId[];
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Mongoose schema for the DirectMessage collection.
 * @const {Schema<IDirectMessage>}
 */
const DirectMessageSchema = new Schema<IDirectMessage>({
    users: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }],
    dmessages: [{
        type: Schema.Types.ObjectId,
        ref: 'DMessage',
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

/**
 * Mongoose model for the DirectMessage collection.
 * @const {Model<IDirectMessage>}
 * @see {@link IDirectMessage}
*/
const DirectMessage = model<IDirectMessage>('DirectMessage', DirectMessageSchema);
export default DirectMessage;
export { IDirectMessage };
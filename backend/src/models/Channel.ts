import { Document, Schema, model } from 'mongoose';

/**
 * Interface representing a Channel document in MongoDB.
 * @interface IChannel
 * @extends Document
 */
interface IChannel extends Document {
    /**
     * The name of the channel.
     * @type {string}
     */
    name: string;
    /**
     * The team that the channel belongs to.
     * @type {Schema.Types.ObjectId}
     * @see {@link Team}
     */
    team: Schema.Types.ObjectId;
    /**
     * The ID of the user who created the channel.
     * @type {Schema.Types.ObjectId}
     * @see {@link User}
     */
    createdBy: Schema.Types.ObjectId;
    /**
     * The members of the channel.
     * @type {Schema.Types.ObjectId[]}
     * @see {@link ChannelMember}
     */
    channelMembers: Schema.Types.ObjectId[];
}

/**
 * Mongoose schema for the Channel collection.
 * @const {Schema<IChannel>}
 */
const ChannelSchema = new Schema<IChannel>({
    name: {
        type: String,
        required: true,
    },
    team: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    channelMembers: [{
        type: Schema.Types.ObjectId,
        ref: 'ChannelMember',
        required: true,
    }],
});

/**
 * Mongoose model for the Channel collection.
 * @const {Model<IChannel>}
 * @see {@link IChannel}
 */
const Channel = model<IChannel>('Channel', ChannelSchema);
export default Channel;
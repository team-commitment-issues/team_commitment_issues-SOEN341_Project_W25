import { Document, Schema, model } from 'mongoose';
import { Permission } from '../enums';

/**
 * Interface representing a ChannelMember document in MongoDB.
 * @interface IChannelMember
 * @extends Document
 */
interface IChannelMember extends Document {
    /**
     * The channel that the user is a member of.
     * @type {Schema.Types.ObjectId}
     * @see {@link Channel}
     */
    channel: Schema.Types.ObjectId;
    /**
     * The user that is a member of the channel.
     * @type {Schema.Types.ObjectId}
     * @see {@link User}
     */
    user: Schema.Types.ObjectId;
    /**
     * The permissions of the user within the channel.
     * @type {Permission[]}
     * @see {@link Permission}
     */
    permissions: Permission[];
}

/**
 * Mongoose schema for the ChannelMember model.
 * 
 * @const {Schema<IChannelMember>}
 */
const ChannelMemberSchema = new Schema<IChannelMember>({
    channel: {
        type: Schema.Types.ObjectId,
        ref: 'Channel',
        required: true,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    permissions: {
        type: [String],
        enum: Object.values(Permission),
        required: true,
    },
});

/**
 * Mongoose model for the ChannelMember model.
 * 
 * @const {Model<IChannelMember>}
 * @see {@link IChannelMember}
 */
const ChannelMember = model<IChannelMember>('ChannelMember', ChannelMemberSchema);
export default ChannelMember;
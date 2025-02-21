import { Document, Schema, model } from 'mongoose';

/**
 * Interface representing a Team document in MongoDB.
 * @interface ITeam
 * @extends Document
 */
interface ITeam extends Document {
    /**
     * The name of the team.
     * @type {string}
     */
    name: string;

    /**
     * The ID of the user who created the team.
     * @type {Schema.Types.ObjectId}
     * @see {@link User}
     */
    createdBy: Schema.Types.ObjectId;

    /**
     * The members of the team.
     * @type {Schema.Types.ObjectId[]}
     * @see {@link TeamMember}
     */
    teamMembers: Schema.Types.ObjectId[];

    /**
     * Channels that belong to the team.
     * @type {Schema.Types.ObjectId[]}
     * @see {@link Channel}
     */
    channels: Schema.Types.ObjectId[];
}

/**
 * Mongoose schema for the Team collection.
 * @const TeamSchema
 * @type {Schema<ITeam>}
 */
const TeamSchema = new Schema<ITeam>({
    name: {
        type: String,
        required: true,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    teamMembers: [{
        type: Schema.Types.ObjectId,
        ref: 'TeamMember',
        required: true,
    }],
    channels: [{
        type: Schema.Types.ObjectId,
        ref: 'Channel',
        default: [],
    }],
});

/**
 * Mongoose model for the Team collection.
 * @const {Model<ITeam>}
 * @see {@link ITeam}
 */
const Team = model<ITeam>('Team', TeamSchema);
export default Team;
export type { ITeam };
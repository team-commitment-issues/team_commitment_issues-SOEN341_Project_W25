import { Document, Schema, model } from "mongoose";
import { TeamRole } from "../enums";

/**
 * Interface representing a TeamMember document in MongoDB.
 * @interface ITeamMember
 * @extends {Document}
 */
interface ITeamMember extends Document {
    /**
     * The user that is a member of the team.
     * @type {Schema.Types.ObjectId}
     * @see {@link User}
     */
    user: Schema.Types.ObjectId;
    /**
     * The team that the user is a member of.
     * @type {Schema.Types.ObjectId}
     * @see {@link Team}
     */
    team: Schema.Types.ObjectId;
    /**
     * The role of the user within the team.
     * @type {TeamRole}
     * @see {@link TeamRole}
     */
    role: TeamRole;
    /**
     * The ChannelMemberships of the user within the team.
     * @type {Schema.Types.ObjectId[]}
     * @see {@link ChannelMember}
     */
    channelMemberships: Schema.Types.ObjectId[];
}

/**
 * Mongoose schema for the TeamMember model.
 * 
 * @const {Schema<ITeamMember>}
 */
const TeamMemberSchema = new Schema<ITeamMember>({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    team: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
        required: true,
    },
    role: {
        type: String,
        enum: Object.values(TeamRole),
        required: true
    },
    channelMemberships: {
        type: [Schema.Types.ObjectId],
        ref: 'ChannelMember',
        default: [],
    }
});

/**
 * Mongoose model for the TeamMember model.
 * 
 * @const {Model<ITeamMember>}
 * @see {@link ITeamMember}
 */
const TeamMember = model<ITeamMember>('TeamMember', TeamMemberSchema);
export default TeamMember;
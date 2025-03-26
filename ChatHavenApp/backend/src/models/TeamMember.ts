import { Document, Schema, model } from 'mongoose';
import { TeamRole } from '../enums';

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
   * The Channels the user has access to within the team.
   * @type {Schema.Types.ObjectId[]}
   * @see {@link Channel}
   */
  channels: Schema.Types.ObjectId[];
  /**
   * The DirectMessages the user has access to within the team.
   * @type {Schema.Types.ObjectId[]}
   * @see {@link DirectMessage}
   */
  directMessages: Schema.Types.ObjectId[];
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
    required: true
  },
  team: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  role: {
    type: String,
    enum: Object.values(TeamRole),
    required: true
  },
  channels: {
    type: [Schema.Types.ObjectId],
    ref: 'Channel',
    default: []
  },
  directMessages: {
    type: [Schema.Types.ObjectId],
    ref: 'DirectMessage',
    default: []
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
export type { ITeamMember };

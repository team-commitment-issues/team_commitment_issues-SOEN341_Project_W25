import { Schema, model, Document } from 'mongoose';
import { Role } from '../enums';

/**
 * Interface representing a User document in MongoDB.
 * @interface IUser
 * @extends {Document}
 */
interface IUser extends Document {
    /**
     * The email of the user.
     * @type {string}
     */
    email: string;

    /**
     * The password of the user.
     * @type {string}
     */
    password: string;

    /**
     * The first name of the user.
     * @type {string}
     */
    firstName: string;

    /**
     * The last name of the user.
     * @type {string}
     */
    lastName: string;

    /**
     * The unique username of the user.
     * @type {string}
     */
    userID: string;

    /**
     * The role of the user.
     * @type {Role}
     */
    role: Role;

    /**
     * List of team memberships for the user.
     * @type {Schema.Types.ObjectId[]}
     */
    teamMemberships: Schema.Types.ObjectId[];
}

/**
 * Mongoose schema for the User model.
 * @const {Schema<IUser>}
 */
const UserSchema = new Schema<IUser>({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: false,
    },
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    userID: {
        type: String,
        required: true,
        unique: true,
    },
    role: {
        type: String,
        enum: Object.values(Role),
        default: Role.USER,
        required: true,
    },
    teamMemberships: {
        type: [Schema.Types.ObjectId],
        ref: 'TeamMember',
        default: [],
    }
});

/**
 * Mongoose model for the User schema.
 * @const {Model<IUser>}
 * @see {@link IUser}
 */
const User = model<IUser>('User', UserSchema);
User.createIndexes();

export default User;
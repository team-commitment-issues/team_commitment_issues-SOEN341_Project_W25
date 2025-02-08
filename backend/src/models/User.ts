import { Schema, model, Document } from 'mongoose';
import { Role, Permission } from '../enums';

interface IUser extends Document{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    userID: string;
    role: Role;
    permissions: Map<string, Permission[]>;
}

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
    permissions: {
        type: Map,
        of: [String],
        default: new Map(),
    }
});
const User = model<IUser>('User', UserSchema);
User.createIndexes();

export default User;

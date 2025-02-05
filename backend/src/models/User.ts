import { Schema, model, Document } from 'mongoose';

interface IUser extends Document{
    username: string;
    email: string;
    password: string;
    date: Date;
}

const UserSchema = new Schema<IUser>({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: false,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
});
const User = model<IUser>('User', UserSchema);
User.createIndexes();

export default User;
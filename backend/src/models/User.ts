import { Schema, model, Document } from 'mongoose';

interface IUser extends Document{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    userID: string;
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
});
const User = model<IUser>('User', UserSchema);
User.createIndexes();

export default User;

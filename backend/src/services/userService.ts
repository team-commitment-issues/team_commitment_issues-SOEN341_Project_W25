import bcrypt from 'bcrypt';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import { Role, Permission } from '../enums';
class UserService {
    static async createUser(email: string, password: string, firstName: string, lastName: string, userID: string, role: Role): Promise<any> {
        const existingUser = await User.findOne({ $or: [{ email }, { userID }] });
        if (existingUser) {
            const field = existingUser.email === email ? 'Email' : 'UserID';
            throw new Error(`${field} already exists`);
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({ email, password: hashedPassword, firstName, lastName, userID, role });
        return await newUser.save();
    }
     
    static async userAuth(userID: string, password: string): Promise<string> {
        const user = await User.findOne({ userID });

        if (!user) {
            throw new Error('User not found');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Incorrect password');
        }

        const token = jwt.sign({ userID: user.userID, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
        return token;
    }

    static async grantPermission(userID: string, channelID: string, permission: Permission): Promise<any> {
        const user = await User.findOne({ userID });
        if (!user) {
            throw new Error('User not found');
        }

        const permissions = user.permissions.get(channelID) || [];
        if (!permissions.includes(permission)) {
            permissions.push(permission);
            user.permissions.set(channelID, permissions);
            user.markModified('permissions');
            return await user.save();
        } else {
            throw new Error('Permission already granted');
        }
    }

    static async revokePermission(userID: string, channelID: string, permission: Permission): Promise<any> {
        const user = await User.findOne({ userID });
        if (!user) {
            throw new Error('User not found');
        }

        const permissions = user.permissions.get(channelID) || [];
        if (permissions.includes(permission)) {
            user.permissions.set(channelID, permissions.filter(p => p !== permission));
            user.markModified('permissions');
            return await user.save();
        } else {
            throw new Error('Permission not granted');
        }
    }

}

export default UserService;

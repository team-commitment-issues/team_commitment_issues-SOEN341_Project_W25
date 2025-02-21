import bcrypt from 'bcrypt';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import { Role } from '../enums';
class UserService {
    static async createUser(email: string, password: string, firstName: string, lastName: string, username: string, role: Role): Promise<any> {
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            const field = existingUser.email === email ? 'Email' : 'UserID';
            throw new Error(`${field} already exists`);
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({ email, password: hashedPassword, firstName, lastName, username, role });
        return await newUser.save();
    }
     
    static async userAuth(username: string, password: string): Promise<string> {
        const user = await User.findOne({ username });

        if (!user) {
            throw new Error('User not found');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Incorrect password');
        }

        try {
            const token = jwt.sign({ username: user.username, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
            return token;
        } catch (err) {
            throw err;
        }
    }
}

export default UserService;

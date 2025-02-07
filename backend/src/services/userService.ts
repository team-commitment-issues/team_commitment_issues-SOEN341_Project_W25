import bcrypt from 'bcrypt';
import User from '../models/User';
import jwt from 'jsonwebtoken';

class UserService {
    static async createUser(email: string, password: string, firstName: string, lastName: string, userID: string): Promise<any> {
        const existingUser = await User.findOne({ $or: [{ email }, { userID }] });
        if (existingUser) {
            const field = existingUser.email === email ? 'Email' : 'UserID';
            throw new Error(`${field} already exists`);
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({ email, password: hashedPassword, firstName, lastName, userID });
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

        const token = jwt.sign({ userID: user.userID, email: user.email }, 'user_token', { expiresIn: '1h' });
        return token;
    }
}

export default UserService;

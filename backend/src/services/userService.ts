import User from '../models/User';

class UserService {
    static async createUser(email: string, password: string, firstName: string, lastName: string, userID: string): Promise<any> {
        const newUser = new User({ email, password, firstName, lastName, userID });
        return await newUser.save();
    }

    static async userAuth(userID: string, password: string): Promise<string> {
        const user = await User.findOne({ userID, password });
        if (!user) {
            throw new Error('Invalid credentials');
        }
        return 'token';
    }
}

export default UserService;
import User from '../models/User';

class UserService {
    static async createUser(userData: any) {
        const newUser = new User(userData);
        await newUser.save();
    }
}

export default UserService;
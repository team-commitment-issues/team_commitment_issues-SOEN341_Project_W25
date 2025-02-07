import bcrypt from 'bcrypt';
import User from '../models/User';

class UserService {
    //allows for creation of new user with hashed password
    static async createUser(email: string, password: string, firstName: string, lastName: string, userID: string): Promise<any> {
        const saltRounds = 10;  // Recommended salt rounds for security
        const hashedPassword = await bcrypt.hash(password, saltRounds); // Hash the password

        const newUser = new User({ email, password: hashedPassword, firstName, lastName, userID });
        return await newUser.save();
    }

    //Authenticate user by comparing the provided password with the stored hashed password
     
    static async userAuth(userID: string, password: string): Promise<boolean> {
        // Find the user by userID
        const user = await User.findOne({ userID });

        if (!user) {
            throw new Error('User not found'); // Return error if user doesn't exist
        }

        // Compare provided password with stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Incorrect password'); // Return error if password doesn't match
        }

        return true; // Authentication successful
    }
}

export default UserService;

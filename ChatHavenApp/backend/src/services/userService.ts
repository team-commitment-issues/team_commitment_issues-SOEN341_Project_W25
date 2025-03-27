import bcrypt from 'bcrypt';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import { Role } from '../enums';

class UserService {
  static async createUser(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    username: string,
    role: Role
  ): Promise<any> {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'UserID';
      throw new Error(`${field} already exists`);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      username,
      role
    });
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
      const token = jwt.sign(
        { username: user.username, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );
      return token;
    } catch (err) {
      throw err;
    }
  }

  static async updateUsername(
    oldUsername: string,
    newUsername: string,
    password: string
  ): Promise<any> {
    const user = await User.findOne({ username: { $eq: oldUsername } });
    if (!user) {
      throw new Error('User not found');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Incorrect password');
    }

    const existingUser = await User.findOne({ username: { $eq: newUsername } });
    if (existingUser) {
      throw new Error('Username already exists');
    }

    user.username = newUsername;
    return await user.save();
  }

  static async updatePassword(
    username: string,
    oldPassword: string,
    newPassword: string
  ): Promise<any> {
    const user = await User.findOne({ username });
    if (!user) {
      throw new Error('User not found');
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new Error('Incorrect password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    return await user.save();
  }

  static async setPreferredLanguage(username: string, language: string): Promise<any> {
    const user = await User.findOne({ username: { $eq: username } });
    if (!user) {
      throw new Error('User not found');
    }

    user.preferredLanguage = language;
    return await user.save();
  }

  static async getUserProfile(username: string): Promise<any> {
    const user = await User.findOne({ username }).select('-password');
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
}

export default UserService;

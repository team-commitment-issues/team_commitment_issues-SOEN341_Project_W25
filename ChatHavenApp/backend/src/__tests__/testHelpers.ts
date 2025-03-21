import User from '../models/User';
import mongoose, { Connection } from 'mongoose';
import { Role, TeamRole } from '../enums';
import Team from '../models/Team';
import Channel from '../models/Channel';
import jwt from 'jsonwebtoken';
import TeamMember from '../models/TeamMember';
import DirectMessage from '../models/DirectMessage';
import bcrypt from 'bcrypt';
import { Message } from '../models/Message';
import DMessage from '../models/DMessage';

class TestHelpers {
    /**
     * Ensures MongoDB connection is established with retry mechanism
     * @param retries Number of connection attempts
     * @param delay Delay between retries in ms
     */
    static async ensureDbConnection(retries = 5, delay = 1000): Promise<void> {
        // Already connected
        if (mongoose.connection.readyState === 1) {
            try {
                // Verify connection is actually working
                if (mongoose.connection.db) {
                    await mongoose.connection.db.admin().ping();
                } else {
                    throw new Error('Database connection is not established');
                }
                return;
            } catch (error) {
                console.log('Connection appears active but verification failed, will reconnect');
                // Continue with reconnection attempt
            }
        }
            
        console.log('Connecting to MongoDB before test...');
        
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                if (mongoose.connection.readyState !== 1) {
                    console.log(`Connection attempt ${attempt}/${retries}`);
                    await mongoose.connect(process.env.MONGO_URI as string, { 
                        dbName: 'testingDB',
                        serverSelectionTimeoutMS: 5000,
                        socketTimeoutMS: 45000,
                        connectTimeoutMS: 10000,
                        maxPoolSize: 10
                    });
                }
                
                // Verify connection is ready
                if (mongoose.connection.db) {
                    await mongoose.connection.db.admin().ping();
                } else {
                    throw new Error('Database connection is not established');
                }
                console.log(`MongoDB connection verified on attempt ${attempt}`);
                return;
            } catch (error) {
                console.error(`Connection attempt ${attempt} failed:`, error);
                
                // If this isn't our last attempt, wait before trying again
                if (attempt < retries) {
                    console.log(`Waiting ${delay}ms before next attempt...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    // Throw error on final attempt
                    throw new Error(`Failed to connect to MongoDB after ${retries} attempts`);
                }
            }
        }
    }
    
    /**
     * Adds connection setup to Jest test suite
     * @param describe The Jest describe function
     */
    static addConnectionHooks(describe: jest.Describe): void {
        // Setup connection before all tests
        beforeAll(async () => {
            await TestHelpers.ensureDbConnection();
        });
        
        // Verify connection before each test
        beforeEach(async () => {
            if (mongoose.connection.readyState !== 1) {
                await TestHelpers.ensureDbConnection(3, 500);
            }
        });
    }
    
    /**
     * Cleans all collections in the database
     */
    static async cleanDatabase(): Promise<void> {
        if (mongoose.connection.readyState !== 1) {
            await TestHelpers.ensureDbConnection();
        }
        
        try {
            if (!mongoose.connection.db) {
                throw new Error('Database connection is not established');
            }
            const collections = await mongoose.connection.db.collections();
            for (const collection of collections) {
                await collection.deleteMany({});
            }
            console.log('All collections cleaned');
        } catch (error) {
            console.error('Failed to clean database:', error);
            throw error;
        }
    }

    static async disconnectMongoose(): Promise<void> {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
    
    static async createTestSuperAdmin(teamMemberships: mongoose.Types.ObjectId[]): Promise<any> {
        await TestHelpers.ensureDbConnection();
        const superAdminUser = new User({
            email: 'superadmin@user.com',
            password: 'testpassword',
            firstName: 'Super',
            lastName: 'Admin',
            username: 'superadminuser',
            role: Role.SUPER_ADMIN,
            teamMemberships,
        });
        await superAdminUser.save();
        return superAdminUser;
    }

    static async createTestUser(email: string, password: string, firstName: string, lastName: string, username: string, role: Role, teamMemberships: mongoose.Types.ObjectId[]): Promise<any> {
        await TestHelpers.ensureDbConnection();
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            username,
            role,
            teamMemberships,
        });
        await user.save();
        return user;
    }

    static async createTestTeam(name: string, createdBy: mongoose.Types.ObjectId, teamMembers: mongoose.Types.ObjectId[], channels: mongoose.Types.ObjectId[]): Promise<any> {
        await TestHelpers.ensureDbConnection();
        const team = new Team({
            name,
            createdBy,
            teamMembers,
            channels,
        });
        await team.save();
        return team;
    }

    static async createTestChannel(name: string, team: mongoose.Types.ObjectId, createdBy: mongoose.Types.ObjectId, members: mongoose.Types.ObjectId[], messages: mongoose.Types.ObjectId[]): Promise<any> {
        await TestHelpers.ensureDbConnection();
        const channel = new Channel({
            name,
            team,
            createdBy,
            members,
            messages,
        });
        await channel.save();
        return channel;
    }

    static async generateToken(username: string, email:string): Promise<string> {
        return jwt.sign({ username, email }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    }

    static async createTestTeamMember(user: mongoose.Types.ObjectId, team: mongoose.Types.ObjectId, role: TeamRole, channels: mongoose.Types.ObjectId[]): Promise<any> {
        await TestHelpers.ensureDbConnection();
        const teamMember = new TeamMember({
            user,
            team,
            role,
            channels,
            directMessages: [],
        });
        await teamMember.save();
        return teamMember;
    }

    static async createTestMessage(text: string, username: string, channel: mongoose.Types.ObjectId): Promise<any> {
        await TestHelpers.ensureDbConnection();
        const message = new Message({
            text,
            username,
            channel
        });
        await message.save();
        return message;
    }

    static async createTestDirectMessage(users: mongoose.Types.ObjectId[], dmessages: mongoose.Types.ObjectId[]): Promise<any> {
        await TestHelpers.ensureDbConnection();
        const directMessage = new DirectMessage({
            users,
            dmessages,
        });
        await directMessage.save();
        return directMessage;
    }

    static async createTestDMessage(text: string, username: string, directMessage: mongoose.Types.ObjectId): Promise<any> {
        await TestHelpers.ensureDbConnection();
        const message = new DMessage({
            text,
            username,
            directMessage
        });
        await message.save();
        return message;
    }
}

export default TestHelpers;
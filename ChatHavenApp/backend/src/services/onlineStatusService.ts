import { Schema, Types } from 'mongoose';
import User from '../models/User';

export type StatusType = 'online' | 'away' | 'busy' | 'offline';

interface UserStatus {
    userId: Schema.Types.ObjectId;
    username: string;
    status: StatusType;
    lastSeen: Date;
}

class OnlineStatusService {
    // In-memory store of online users and their statuses
    private static onlineUsers: Map<string, UserStatus> = new Map();
    
    // Track WebSocket connections per user
    private static userConnections: Map<string, number> = new Map();

    /**
     * Get online status for multiple users
     */
    static async getUserOnlineStatus(usernames: string[]): Promise<UserStatus[]> {
        const statuses: UserStatus[] = [];
        
        // Get status for each requested username
        for (const username of usernames) {
            // If we have the status in memory
            if (this.onlineUsers.has(username)) {
                statuses.push(this.onlineUsers.get(username)!);
            } else {
                // Otherwise, fetch from database
                const user = await User.findOne({ username });
                if (user) {
                    const status: UserStatus = {
                        userId: user._id as Schema.Types.ObjectId,
                        username,
                        status: 'offline',
                        lastSeen: user.lastSeen || new Date()
                    };
                    
                    statuses.push(status);
                    
                    // Cache this status for future requests
                    this.onlineUsers.set(username, status);
                }
            }
        }
        
        return statuses;
    }

    /**
     * Set a user's status explicitly
     */
    static async setUserStatus(userId: Schema.Types.ObjectId, username: string, status: StatusType): Promise<UserStatus> {
        // Update the database
        await User.findByIdAndUpdate(userId, { 
            lastSeen: new Date(),
            status
        });
        
        // Update our in-memory cache
        const userStatus: UserStatus = {
            userId,
            username,
            status,
            lastSeen: new Date()
        };
        
        this.onlineUsers.set(username, userStatus);
        
        return userStatus;
    }

    /**
     * Track user connection - called when a user connects via WebSocket
     */
    static trackUserConnection(userId: Schema.Types.ObjectId, username: string): void {
        const connections = this.userConnections.get(username) || 0;
        this.userConnections.set(username, connections + 1);
        
        // If this is the first connection, set status to online
        if (connections === 0) {
            this.setUserStatus(userId, username, 'online');
        }
    }

    /**
     * Track user disconnection - called when a user disconnects via WebSocket
     */
    static async trackUserDisconnection(userId: Schema.Types.ObjectId, username: string): Promise<void> {
        const connections = this.userConnections.get(username) || 0;
        
        if (connections <= 1) {
            // This was the last connection, set to offline
            this.userConnections.delete(username);
            await this.setUserStatus(userId, username, 'offline');
        } else {
            // User still has other connections
            this.userConnections.set(username, connections - 1);
        }
    }

    /**
     * Get users who should receive status updates for a team
     * This returns all members of a team
     */
    static async getTeamSubscribers(teamId: Schema.Types.ObjectId): Promise<string[]> {
        // This would typically query your TeamMember collection
        // to find all members of a team
        const TeamMember = require('../models/TeamMember').default;
        
        const members = await TeamMember.find({ team: teamId })
            .populate('user', 'username')
            .lean();
            
        return members.map((member: any) => member.user.username);
    }

    /**
     * Get all team IDs a user belongs to
     */
    static async getUserTeams(userId: Schema.Types.ObjectId): Promise<Schema.Types.ObjectId[]> {
        const TeamMember = require('../models/TeamMember').default;
        
        const memberships = await TeamMember.find({ user: userId })
            .select('team')
            .lean();
            
        return memberships.map((membership: any) => membership.team);
    }

    /**
     * Clear stale users - should be run periodically
     */
    static clearStaleUsers(): void {
        const now = new Date();
        const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
        
        for (const [username, status] of this.onlineUsers.entries()) {
            // Only consider offline users
            if (status.status === 'offline') {
                const lastSeen = status.lastSeen;
                
                if (now.getTime() - lastSeen.getTime() > ONE_MONTH_MS) {
                    // Remove users inactive for more than a month
                    this.onlineUsers.delete(username);
                }
            }
        }
    }
}

export default OnlineStatusService;
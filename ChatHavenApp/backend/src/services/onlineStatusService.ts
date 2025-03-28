import { Schema, Types } from 'mongoose';
import User from '../models/User';
import { Status } from '../enums';
import TeamMember from '../models/TeamMember';

interface UserStatus {
  userId: Schema.Types.ObjectId;
  username: string;
  status: Status;
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
        const user = await User.findOne({ username: { $eq: username } });
        if (user) {
          const status: UserStatus = {
            userId: user._id as Schema.Types.ObjectId,
            username,
            status: user.status || Status.OFFLINE,
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
  static async setUserStatus(
    userId: Schema.Types.ObjectId,
    username: string,
    status: Status
  ): Promise<UserStatus> {
    // Update the database
    await User.findByIdAndUpdate(userId, {
      lastSeen: new Date(),
      status: status.toString()
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
  static async trackUserConnection(userId: Schema.Types.ObjectId, username: string): Promise<void> {
    const connections = this.userConnections.get(username) || 0;
    this.userConnections.set(username, connections + 1);

    // If this is the first connection, set status to online
    if (connections === 0) {
      this.setUserStatus(userId, username, Status.ONLINE);
    }
  }

  /**
   * Track user disconnection - called when a user disconnects via WebSocket
   */
  static async trackUserDisconnection(
    userId: Schema.Types.ObjectId,
    username: string
  ): Promise<void> {
    const connections = this.userConnections.get(username) || 0;

    const newConnectionCount = Math.max(0, connections - 1);

    if (newConnectionCount === 0) {
      // This was the last connection, set to offline
      this.userConnections.delete(username);
      await this.setUserStatus(userId, username, Status.OFFLINE);
    } else {
      // User still has other connections
      this.userConnections.set(username, newConnectionCount);
    }
  }

  /**
   * Get users who should receive status updates for a team
   * This returns all members of a team
   */
  static async getTeamSubscribers(teamId: Schema.Types.ObjectId): Promise<string[]> {
    const members = await TeamMember.find({ team: teamId });
    const subscribers = await Promise.all(
      members.map(async (member: any) => await User.findById(member.user))
    );
    return subscribers.map((subscriber: any) => subscriber.username);
  }

  /**
   * Get all team IDs a user belongs to
   */
  static async getUserTeams(userId: Schema.Types.ObjectId): Promise<Schema.Types.ObjectId[]> {
    const memberships = await TeamMember.find({ user: userId }).select('team');

    return memberships.map((membership: any) => membership.team);
  }

  /**
   * Clear stale users - should be run periodically
   */
  static async clearStaleUsers(): Promise<void> {
    const now = new Date();
    const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

    for (const [username, status] of this.onlineUsers.entries()) {
      // Only consider offline users
      if (status.status === Status.OFFLINE) {
        const lastSeen = status.lastSeen;

        if (now.getTime() - lastSeen.getTime() > ONE_MONTH_MS) {
          // Remove users inactive for more than a month
          this.onlineUsers.delete(username);
        }
      }
    }
  }

  /**
   * Get a user by username
   */
  static async getUserByUsername(username: string): Promise<any> {
    return await User.findOne({ username: { $eq: username } });
  }

  /**
   * Get number of connections for a user
   * 
   */
  static getUserConnectionCount(username: string): number {
    return this.userConnections.get(username) || 0;
  }

  /**
   * Verify active statuses
   * This is a periodic check to ensure that users with no connections are marked as offline
   */
  static async verifyActiveStatuses(): Promise<void> {
    for (const [username, status] of this.onlineUsers.entries()) {
      const connections = this.userConnections.get(username) || 0;

      // If no connections but status is ONLINE, fix it
      if (connections === 0 && status.status === Status.ONLINE) {
        const user = await User.findOne({ username });
        if (user) {
          await this.setUserStatus(user._id as Schema.Types.ObjectId, username, Status.OFFLINE);
        }
      }
    }
  }
}

export default OnlineStatusService;

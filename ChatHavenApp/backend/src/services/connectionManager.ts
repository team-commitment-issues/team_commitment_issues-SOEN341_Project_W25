// services/connectionManager.ts
import { WebSocket, WebSocketServer } from 'ws';
import { Schema } from 'mongoose';
import { createLogger } from '../utils/logger';
import { Status } from '../enums';
import { ExtendedWebSocket } from '../types/websocket';
import OnlineStatusService from './onlineStatusService';

const logger = createLogger('ConnectionManager');

/**
 * Manages WebSocket connections and provides methods for monitoring and stats
 */
export class ConnectionManager {
  private wss: WebSocketServer;
  private stats: {
    totalConnections: number;
    peakConnections: number;
    totalMessages: number;
    activeUsers: Set<string>;
  };

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.stats = {
      totalConnections: 0,
      peakConnections: 0,
      totalMessages: 0,
      activeUsers: new Set()
    };

    // Set up interval to log connection statistics
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => this.logStats(), 5 * 60 * 1000); // Log every 5 minutes in production
    } else {
      setInterval(() => this.logStats(), 60 * 1000); // Log every minute in development
    }
  }

  /**
   * Track a new connection
   * @param ws WebSocket connection
   */
  trackConnection(ws: ExtendedWebSocket): void {
    this.stats.totalConnections++;
    
    if (this.wss.clients.size > this.stats.peakConnections) {
      this.stats.peakConnections = this.wss.clients.size;
    }
    
    if (ws.user) {
      this.stats.activeUsers.add(ws.user.username);
    }
  }

  /**
   * Track a new message
   */
  trackMessage(): void {
    this.stats.totalMessages++;
  }

  /**
   * Update a user's status across all clients
   * @param username User's username
   * @param status New status
   * @param lastSeen Last seen timestamp
   */
  async broadcastStatusUpdate(
    username: string, 
    status: Status, 
    lastSeen: Date
  ): Promise<void> {
    try {
      const user = await OnlineStatusService.getUserByUsername(username);
      if (!user) return;
      
      const teamIds = await OnlineStatusService.getUserTeams(user._id as Schema.Types.ObjectId);
      
      // Collect all subscribers across teams
      const subscribers = new Set<string>();
      for (const teamId of teamIds) {
        const teamSubscribers = await OnlineStatusService.getTeamSubscribers(teamId);
        teamSubscribers.forEach(sub => subscribers.add(sub));
      }
      
      // Format the status update
      const statusUpdate = {
        type: 'statusUpdate',
        username,
        status,
        lastSeen: lastSeen.toISOString()
      };
      
      // Send to all subscribed clients
      let sentCount = 0;
      this.wss.clients.forEach((client) => {
        const extendedClient = client as ExtendedWebSocket;
        
        if (extendedClient.readyState === WebSocket.OPEN && 
            extendedClient.user && 
            subscribers.has(extendedClient.user.username)) {
          
          extendedClient.send(JSON.stringify(statusUpdate));
          sentCount++;
        }
      });
      
      logger.debug('Broadcast status update', { username, status, sentCount });
    } catch (error) {
      logger.error('Error broadcasting status update', { 
        username, 
        status, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Get connections for a specific user
   * @param username User's username
   * @returns Array of WebSockets for the user
   */
  getUserConnections(username: string): ExtendedWebSocket[] {
    const connections: ExtendedWebSocket[] = [];
    
    this.wss.clients.forEach((client) => {
      const extendedClient = client as ExtendedWebSocket;
      if (extendedClient.user && extendedClient.user.username === username) {
        connections.push(extendedClient);
      }
    });
    
    return connections;
  }

  /**
   * Send a message to all connections for a user
   * @param username User's username
   * @param message Message to send
   */
  sendToUser(username: string, message: any): void {
    const connections = this.getUserConnections(username);
    const messageStr = JSON.stringify(message);
    
    for (const connection of connections) {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(messageStr);
      }
    }
    
    logger.debug('Sent message to user', { 
      username, 
      connections: connections.length 
    });
  }

  /**
   * Get current server stats
   */
  getStats() {
    return {
      ...this.stats,
      currentConnections: this.wss.clients.size,
      activeUsers: Array.from(this.stats.activeUsers),
      activeUserCount: this.stats.activeUsers.size
    };
  }

  /**
   * Log current connection statistics
   */
  private logStats(): void {
    logger.info('Connection statistics', {
      currentConnections: this.wss.clients.size,
      peakConnections: this.stats.peakConnections,
      totalConnections: this.stats.totalConnections,
      totalMessages: this.stats.totalMessages,
      activeUserCount: this.stats.activeUsers.size
    });
  }
}

// Export as default
export default ConnectionManager;
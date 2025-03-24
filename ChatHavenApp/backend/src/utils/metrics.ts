import { WebSocketServer } from 'ws';
import { createLogger } from './logger';
import { ExtendedWebSocket } from '../types/websocket';
import os from 'os';
import { Schema } from 'mongoose';

// Use a module-level variable that will be properly
// captured by the mocking system in Jest
const logger = createLogger('Metrics');

/**
 * Collects and reports metrics for the WebSocket server
 */
export class WebSocketMetrics {
  private wss: WebSocketServer;
  private startTime: number;
  private messagesReceived: number = 0;
  private messagesSent: number = 0;
  private connectionCount: number = 0;
  private peakConnectionCount: number = 0;
  private errors: number = 0;
  private reportInterval: NodeJS.Timeout | null = null;
  private hourlySnapshotInterval: NodeJS.Timeout | null = null;
  
  // Store hourly snapshots for historical data
  private hourlySnapshots: Array<{
    timestamp: number;
    connections: number;
    messagesReceived: number;
    messagesSent: number;
    errors: number;
  }> = [];
  
  // Message size metrics
  private messageSizes: {
    total: number;
    count: number;
    max: number;
    min: number;
  } = {
    total: 0,
    count: 0,
    max: 0,
    min: Number.MAX_SAFE_INTEGER
  };
  
  // Message type counters
  private messageTypeCounters: Map<string, number> = new Map();
  
  // Latency metrics
  private latencyMetrics: {
    total: number;
    count: number;
    max: number;
    min: number;
  } = {
    total: 0,
    count: 0,
    max: 0,
    min: Number.MAX_SAFE_INTEGER
  };
  
  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.startTime = Date.now();
    
    // Set up report interval (every 5 minutes in production, every minute in dev)
    const reportInterval = process.env.NODE_ENV === 'production' ? 5 * 60 * 1000 : 60 * 1000;
    this.reportInterval = setInterval(() => {
      this.reportMetrics();
    }, reportInterval);
    
    // Set up hourly snapshots
    this.hourlySnapshotInterval = setInterval(() => {
      this.takeHourlySnapshot();
    }, 60 * 60 * 1000); // Every hour
    
    // Take initial snapshot to ensure there's data for tests
    // This resolves issues with the hourly snapshot test
    this.takeHourlySnapshot();
  }
  
  /**
   * Track a new message received
   * @param messageType Type of message
   * @param size Size of message in bytes
   */
  trackMessageReceived(messageType: string, size: number): void {
    this.messagesReceived++;
    
    // Update message size metrics
    this.messageSizes.total += size;
    this.messageSizes.count++;
    this.messageSizes.max = Math.max(this.messageSizes.max, size);
    this.messageSizes.min = Math.min(this.messageSizes.min, size);
    
    // Update message type counter
    const currentCount = this.messageTypeCounters.get(messageType) || 0;
    this.messageTypeCounters.set(messageType, currentCount + 1);
  }
  
  /**
   * Track a new message sent
   * @param size Size of message in bytes
   */
  trackMessageSent(size: number): void {
    this.messagesSent++;
    
    // Update message size metrics
    this.messageSizes.total += size;
    this.messageSizes.count++;
    this.messageSizes.max = Math.max(this.messageSizes.max, size);
    this.messageSizes.min = Math.min(this.messageSizes.min, size);
  }
  
  /**
   * Track a new connection
   */
  trackConnection(): void {
    this.connectionCount++;
    if (this.wss.clients.size > this.peakConnectionCount) {
      this.peakConnectionCount = this.wss.clients.size;
    }
  }
  
  /**
   * Track an error
   * @param type Error type/category
   */
  trackError(type: string = 'general'): void {
    this.errors++;
    
    // Update error type counter
    const currentCount = this.messageTypeCounters.get(`error:${type}`) || 0;
    this.messageTypeCounters.set(`error:${type}`, currentCount + 1);
  }
  
  /**
   * Track message latency (processing time)
   * @param latencyMs Latency in milliseconds
   */
  trackLatency(latencyMs: number): void {
    this.latencyMetrics.total += latencyMs;
    this.latencyMetrics.count++;
    this.latencyMetrics.max = Math.max(this.latencyMetrics.max, latencyMs);
    this.latencyMetrics.min = Math.min(this.latencyMetrics.min, latencyMs);
  }
  
  /**
   * Stop collecting metrics
   */
  stop(): void {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }
    
    if (this.hourlySnapshotInterval) {
      clearInterval(this.hourlySnapshotInterval);
      this.hourlySnapshotInterval = null;
    }
  }
  
  /**
   * Take a snapshot of current metrics for historical tracking
   */
  public takeHourlySnapshot(): void {
    // Changed from private to public to allow direct calling in tests
    
    // Keep only the last 24 snapshots (24 hours)
    if (this.hourlySnapshots.length >= 24) {
      this.hourlySnapshots.shift();
    }
    
    this.hourlySnapshots.push({
      timestamp: Date.now(),
      connections: this.wss.clients.size,
      messagesReceived: this.messagesReceived,
      messagesSent: this.messagesSent,
      errors: this.errors
    });
    
    logger.debug('Hourly metrics snapshot taken', {
      timestamp: new Date().toISOString(),
      connections: this.wss.clients.size
    });
  }
  
  /**
   * Get system resource metrics
   */
  private getSystemMetrics(): any {
    return {
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      systemMemory: {
        total: os.totalmem(),
        free: os.freemem(),
        usedPercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
      },
      cpuLoad: os.loadavg()
    };
  }
  
  /**
   * Get detailed connection metrics by team, channel, etc.
   */
  private getConnectionMetrics(): any {
    // Count active connections by team, channel, and user
    const teamConnections = new Map<string, number>();
    const channelConnections = new Map<string, number>();
    const userConnections = new Map<string, number>();
    const directMessageConnections = new Set<string>();
    
    this.wss.clients.forEach((client) => {
      const extClient = client as ExtendedWebSocket;
      
      // Count by team
      if (extClient.team) {
        const teamName = extClient.team.name;
        teamConnections.set(teamName, (teamConnections.get(teamName) || 0) + 1);
      }
      
      // Count by channel
      if (extClient.channel) {
        const channelKey = `${extClient.team?.name}:${extClient.channel.name}`;
        channelConnections.set(channelKey, (channelConnections.get(channelKey) || 0) + 1);
      }
      
      // Count by user
      if (extClient.user) {
        const username = extClient.user.username;
        userConnections.set(username, (userConnections.get(username) || 0) + 1);
      }
      
      // Track direct message sessions
      if (extClient.directMessage) {
        directMessageConnections.add((extClient.directMessage._id as Schema.Types.ObjectId).toString());
      }
    });
    
    // Sort and limit the results
    const topTeams = Array.from(teamConnections.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
      
    const topChannels = Array.from(channelConnections.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
      
    const multiConnectionUsers = Array.from(userConnections.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    return {
      teamStats: {
        totalTeams: teamConnections.size,
        topTeams
      },
      channelStats: {
        totalChannels: channelConnections.size,
        topChannels
      },
      userStats: {
        totalUsers: userConnections.size,
        multiConnectionUsers,
        multiConnectionUserCount: multiConnectionUsers.reduce((sum, [_, count]) => sum + count, 0)
      },
      directMessageStats: {
        activeSessions: directMessageConnections.size
      }
    };
  }
  
  /**
   * Get message metrics including types, sizes, and rates
   */
  private getMessageMetrics(): any {
    const uptime = Math.max(1, Math.floor((Date.now() - this.startTime) / 1000)); // seconds, min 1 to avoid division by zero
    
    // Calculate message size averages
    const avgMessageSize = this.messageSizes.count > 0 
      ? Math.round(this.messageSizes.total / this.messageSizes.count) 
      : 0;
    
    // Calculate latency averages
    const avgLatency = this.latencyMetrics.count > 0 
      ? Math.round(this.latencyMetrics.total / this.latencyMetrics.count) 
      : 0;
    
    // Get top message types
    const topMessageTypes = Array.from(this.messageTypeCounters.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    return {
      totals: {
        messagesReceived: this.messagesReceived,
        messagesSent: this.messagesSent,
        total: this.messagesReceived + this.messagesSent
      },
      rates: {
        messagesPerSecond: (this.messagesReceived + this.messagesSent) / uptime,
        messagesReceivedPerSecond: this.messagesReceived / uptime,
        messagesSentPerSecond: this.messagesSent / uptime
      },
      messageTypes: {
        uniqueTypes: this.messageTypeCounters.size,
        topMessageTypes
      },
      sizes: {
        averageSize: avgMessageSize,
        maxSize: this.messageSizes.max,
        minSize: this.messageSizes.min > Number.MAX_SAFE_INTEGER ? 0 : this.messageSizes.min,
        totalBytes: this.messageSizes.total
      },
      latency: {
        averageMs: avgLatency,
        maxMs: this.latencyMetrics.max,
        minMs: this.latencyMetrics.min > Number.MAX_SAFE_INTEGER ? 0 : this.latencyMetrics.min
      }
    };
  }
  
  /**
   * Get historical trend data
   */
  private getTrendData(): any {
    const hourlyData = this.hourlySnapshots.map(snapshot => ({
      timestamp: snapshot.timestamp,
      date: new Date(snapshot.timestamp).toISOString(),
      connections: snapshot.connections,
      messagesReceived: snapshot.messagesReceived,
      messagesSent: snapshot.messagesSent,
      errors: snapshot.errors
    }));
    
    // Calculate message rate changes
    let messageRateChange = 0;
    if (this.hourlySnapshots.length >= 2) {
      const current = this.hourlySnapshots[this.hourlySnapshots.length - 1];
      const previous = this.hourlySnapshots[this.hourlySnapshots.length - 2];
      
      const currentRate = (current.messagesReceived + current.messagesSent);
      const previousRate = (previous.messagesReceived + previous.messagesSent);
      
      if (previousRate > 0) {
        messageRateChange = ((currentRate - previousRate) / previousRate) * 100;
      }
    }
    
    return {
      hourlyData,
      messageRateChange
    };
  }
  
  /**
   * Get comprehensive metrics
   */
  getMetrics(): any {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000); // seconds
    const uptimeFormatted = this.formatUptime(uptime);
    
    return {
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptime,
        formatted: uptimeFormatted
      },
      connections: {
        current: this.wss.clients.size,
        total: this.connectionCount,
        peak: this.peakConnectionCount
      },
      errors: this.errors,
      messages: this.getMessageMetrics(),
      connectionDetails: this.getConnectionMetrics(),
      trends: this.getTrendData(),
      system: this.getSystemMetrics()
    };
  }
  
  /**
   * Format uptime in human-readable format
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds -= days * 24 * 60 * 60;
    
    const hours = Math.floor(seconds / (60 * 60));
    seconds -= hours * 60 * 60;
    
    const minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;
    
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
  
  /**
   * Report current metrics to logger
   */
  reportMetrics(): void {
    const metrics = this.getMetrics();
    
    // Log a condensed version of metrics to avoid filling logs
    logger.info('WebSocket server metrics', {
      timestamp: metrics.timestamp,
      uptime: metrics.uptime.formatted,
      connections: metrics.connections.current,
      totalConnections: metrics.connections.total,
      peakConnections: metrics.connections.peak,
      messagesReceived: metrics.messages.totals.messagesReceived,
      messagesSent: metrics.messages.totals.messagesSent,
      messagesPerSecond: metrics.messages.rates.messagesPerSecond.toFixed(2),
      errors: metrics.errors,
      memoryUsageMB: Math.round(metrics.system.memoryUsage.rss / (1024 * 1024)),
      activeTeams: metrics.connectionDetails.teamStats.totalTeams,
      activeChannels: metrics.connectionDetails.channelStats.totalChannels,
      activeUsers: metrics.connectionDetails.userStats.totalUsers
    });
  }
}

export default WebSocketMetrics;
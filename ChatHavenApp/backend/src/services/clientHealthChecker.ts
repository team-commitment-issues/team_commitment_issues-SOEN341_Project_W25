// services/clientHealthChecker.ts
import { WebSocketServer, WebSocket } from 'ws';
import { createLogger } from '../utils/logger';
import { ExtendedWebSocket } from '../types/websocket';

const logger = createLogger('ClientHealthChecker');

/**
 * Implements a ping/pong health check mechanism for WebSocket clients
 * to detect and clean up stale connections
 */
export class ClientHealthChecker {
  private wss: WebSocketServer;
  private pingInterval: NodeJS.Timeout | null = null;
  private pingIntervalMs: number;
  private timeoutMs: number;

  /**
   * Create a new ClientHealthChecker
   * @param wss WebSocketServer instance
   * @param pingIntervalMs How often to ping clients (default: 30 seconds)
   * @param timeoutMs How long to wait for pong before terminating connection (default: 10 seconds)
   */
  constructor(
    wss: WebSocketServer, 
    pingIntervalMs: number = 30000, 
    timeoutMs: number = 10000
  ) {
    this.wss = wss;
    this.pingIntervalMs = pingIntervalMs;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Start the health checking process
   */
  start(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => this.pingClients(), this.pingIntervalMs);
    logger.info('Client health checker started', { 
      pingIntervalMs: this.pingIntervalMs,
      timeoutMs: this.timeoutMs 
    });
    
    return;
  }

  /**
   * Stop the health checking process
   */
  stop(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
      logger.info('Client health checker stopped');
    }
  }

  /**
   * Send ping to all connected clients and track responses
   */
  private pingClients(): void {
    const clients = Array.from(this.wss.clients);
    const timestamp = Date.now();
    
    let activeCount = 0;
    let terminatedCount = 0;
    
    clients.forEach((client: WebSocket) => {
      const extClient = client as ExtendedWebSocket;
      
      if (extClient.readyState !== WebSocket.OPEN) {
        return;
      }
      
      // Check if client has been unresponsive
      if (extClient.isAlive === false) {
        logger.warn('Terminating unresponsive client', { 
          sessionId: extClient.sessionId,
          username: extClient.user?.username
        });
        terminatedCount++;
        extClient.terminate();
        return;
      }
      
      // Mark as requiring response
      extClient.isAlive = false;
      
      // Set a ping timeout
      const pingTimeout = setTimeout(() => {
        if (extClient.isAlive === false) {
          logger.warn('Client ping timeout', { 
            sessionId: extClient.sessionId,
            username: extClient.user?.username
          });
          extClient.terminate();
        }
      }, this.timeoutMs);
      
      // Send ping and wait for pong (which sets isAlive back to true)
      extClient.ping(Buffer.from(timestamp.toString()), undefined, (err) => {
        if (err) {
          clearTimeout(pingTimeout);
          logger.error('Error sending ping', { 
            sessionId: extClient.sessionId,
            error: err.message
          });
          extClient.terminate();
        }
      });
      
      activeCount++;
    });

    if (terminatedCount > 0) {
      logger.info('Health check complete', { 
        activeClients: activeCount,
        terminatedClients: terminatedCount
      });
    }
  }

  /**
   * Setup pong handling for a client
   * @param ws Client WebSocket
   */
  setupClient(ws: ExtendedWebSocket): void {
    ws.isAlive = true;
    
    ws.on('pong', (data) => {
      // Mark client as responsive
      ws.isAlive = true;
      
      // Calculate round-trip time if timestamp was included
      try {
        const timestamp = parseInt(data.toString());
        const rtt = Date.now() - timestamp;
        
        // Only log if RTT seems unusually high
        if (rtt > 1000) {
          logger.debug('High ping latency detected', { 
            sessionId: ws.sessionId,
            username: ws.user?.username,
            rttMs: rtt 
          });
        }
      } catch (err) {
        // Ignore parsing errors
      }
    });
  }
}

export default ClientHealthChecker;
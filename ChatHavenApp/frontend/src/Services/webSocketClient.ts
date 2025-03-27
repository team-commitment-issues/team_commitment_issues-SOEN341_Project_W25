import { WebSocketMessage } from '../types/shared.ts';

// Define event types for WebSocket events
type MessageCallback = (data: any) => void;
type ConnectionCallback = () => void;
type ErrorCallback = (error: Event) => void;

// Define subscription object
interface Subscription {
  id: string;
  type: string;
  callback: MessageCallback;
}

interface RetryInfo {
  message: WebSocketMessage;
  attempts: number;
  timeout: NodeJS.Timeout | null;
  clientMessageId?: string;
  createdAt: number;
}

/**
 * Singleton WebSocket service to manage a single connection
 * that can be shared across the application
 */
class WebSocketClient {
  private static instance: WebSocketClient;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_INTERVAL_MS = 1000;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 3000;

  private subscriptions: Subscription[] = [];
  private connectionCallbacks: ConnectionCallback[] = [];
  private disconnectionCallbacks: ConnectionCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private messageQueue: WebSocketMessage[] = [];
  private pendingMessages: Map<string, RetryInfo> = new Map();
  private isConnecting = false;
  private messageStatusCallbacks: Map<string, (status: string) => void> = new Map();

  // Flag to disable retries for backward compatibility
  private enableRetries = false;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): WebSocketClient {
    if (!WebSocketClient.instance) {
      WebSocketClient.instance = new WebSocketClient();
    }
    return WebSocketClient.instance;
  }

  /**
   * Connect to the WebSocket Client
   */
  public connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        // Add a temporary callback to resolve when connected
        const tempCallback = () => {
          this.removeConnectionListener(tempCallback);
          resolve();
        };
        this.addConnectionListener(tempCallback);
        return;
      }

      this.isConnecting = true;

      if (this.ws) {
        this.ws.close(1000, 'Creating new connection');
        this.ws = null;
      }

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = process.env.REACT_APP_WS_HOST || window.location.host;
      this.ws = new WebSocket(`${wsProtocol}//${wsHost}/ws?token=${token}`);

      this.ws.onopen = () => {
        console.log('WebSocket connection established');
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Process queued messages
        if (this.messageQueue.length > 0) {
          console.log(`Processing ${this.messageQueue.length} queued messages`);
          this.messageQueue.forEach(msg => this.sendWithoutQueuing(msg));
          this.messageQueue = [];
        }

        // Resume pending messages that were being retried if enabled
        if (this.enableRetries && this.pendingMessages.size > 0) {
          console.log(`Resuming ${this.pendingMessages.size} pending messages`);
          this.pendingMessages.forEach((info, id) => {
            // Clear any existing timeouts
            if (info.timeout) {
              clearTimeout(info.timeout);
              info.timeout = null;
            }
            // Resend immediately
            this.sendWithoutQueuing(info.message);
            // Setup new retry if needed
            this.setupRetry(id, info);
          });
        }

        // Notify listeners
        this.connectionCallbacks.forEach(callback => callback());
        resolve();
      };

      this.ws.onclose = event => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        this.isConnecting = false;

        // Notify listeners
        this.disconnectionCallbacks.forEach(callback => callback());

        if (event.code === 1000 && event.reason) {
          // Intentional close, don't reconnect
          return;
        }

        // Attempt to reconnect with exponential backoff
        if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          const delay = this.RECONNECT_INTERVAL_MS * Math.pow(2, this.reconnectAttempts);
          this.reconnectAttempts++;
          console.log(`Attempting to reconnect in ${delay}ms...`);
          setTimeout(() => this.connect(token), delay);
        } else {
          console.error('Max reconnection attempts reached');
          reject(new Error('Max reconnection attempts reached'));
        }
      };

      this.ws.onerror = error => {
        console.error('WebSocket error:', error);
        this.errorCallbacks.forEach(callback => callback(error));
        this.isConnecting = false;
        reject(error);
      };

      this.ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);

          // Ensure file information is correctly passed along
          if ((data.type === 'message' || data.type === 'directMessage') &&
            (data.fileName || data.fileUrl)) {
            console.log('Received file data:', data);
          }

          this.handleMessageResponse(data);

          // Dispatch to all relevant subscriptions
          this.subscriptions
            .filter(sub => sub.type === data.type || sub.type === '*')
            .forEach(sub => sub.callback(data));
        } catch (error) {
          console.error('Failed to parse incoming message:', error);
        }
      };
    });
  }

  /**
   * Enables or disables the retry mechanism
   */
  public setRetryEnabled(enabled: boolean): void {
    this.enableRetries = enabled;
  }

  private handleMessageResponse(data: any): void {
    // Enhanced file message detection
    const isFileMessage = !!(
      (data.type === 'message' || data.type === 'directMessage') &&
      data.fileName &&
      data.fileType
    );

    // If this is a file message, ensure we log properly
    if (isFileMessage) {
      console.log('File message received:', {
        type: data.type,
        messageId: data._id,
        clientMessageId: data.clientMessageId,
        fileName: data.fileName,
        fileType: data.fileType,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize
      });
    }

    // Process client message acknowledgment
    if ((data.type === 'message' || data.type === 'directMessage') &&
      data.clientMessageId && this.pendingMessages.has(data.clientMessageId)) {
      // This is a message with a clientMessageId, consider it acknowledged
      const pendingInfo = this.pendingMessages.get(data.clientMessageId);
      if (pendingInfo?.timeout) {
        clearTimeout(pendingInfo.timeout);
      }
      this.pendingMessages.delete(data.clientMessageId);

      // Call status callback if registered
      const statusCallback = this.messageStatusCallbacks.get(data.clientMessageId);
      if (statusCallback) {
        statusCallback('sent');

        // Keep callback for potential read receipts
        setTimeout(() => {
          // If we don't receive a read receipt within 5 seconds, clean up
          if (this.messageStatusCallbacks.has(data.clientMessageId)) {
            this.messageStatusCallbacks.delete(data.clientMessageId);
          }
        }, 5000);
      }
    }

    // Handle explicit message acknowledgments if they exist
    if (data.type === 'messageAck' && data.messageId) {
      console.log(`Message acknowledgment received for ${data.messageId}, status: ${data.status}`);

      // If clientMessageId is provided, use that to find the callback
      if (data.clientMessageId && this.messageStatusCallbacks.has(data.clientMessageId)) {
        const callback = this.messageStatusCallbacks.get(data.clientMessageId);
        if (callback) {
          callback(data.status || 'delivered');
        }
      } else {
        // Otherwise try to find by messageId in all callbacks
        this.messageStatusCallbacks.forEach((callback, id) => {
          callback(data.status || 'delivered');
        });
      }
    }
  }

  /**
   * Setup retry mechanism for a message
   */
  private setupRetry(clientMessageId: string, info: RetryInfo): void {
    // Skip if retries are disabled
    if (!this.enableRetries) return;

    // Clear existing timeout if any
    if (info.timeout) {
      clearTimeout(info.timeout);
      info.timeout = null;
    }

    // If max retries reached, mark as failed
    if (info.attempts >= this.MAX_RETRY_ATTEMPTS) {
      const statusCallback = this.messageStatusCallbacks.get(clientMessageId);
      if (statusCallback) {
        statusCallback('failed');
        this.messageStatusCallbacks.delete(clientMessageId);
      }
      this.pendingMessages.delete(clientMessageId);
      return;
    }

    // Setup new retry timeout
    const timeout = setTimeout(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log(`Retrying message ${clientMessageId}, attempt ${info.attempts + 1}`);

        // Clone the message to avoid potential mutations
        const messageToRetry = { ...info.message };
        this.sendWithoutQueuing(messageToRetry);

        // Update retry info
        const updatedInfo = this.pendingMessages.get(clientMessageId);
        if (updatedInfo) {
          updatedInfo.attempts += 1;
          this.setupRetry(clientMessageId, updatedInfo);
        }
      } else {
        // Connection lost, keep the message in pending state
        // It will be retried when connection is restored
      }
    }, this.RETRY_DELAY_MS);

    // Store updated info
    info.timeout = timeout;
    this.pendingMessages.set(clientMessageId, info);
  }

  /**
   * Send a message through the WebSocket (directly, without queuing)
   */
  private sendWithoutQueuing(message: WebSocketMessage): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Send a message through the WebSocket with tracking
   */
  public send(message: WebSocketMessage): string {
    // Generate a client-side message ID if not provided
    const clientMessageId =
      message.clientMessageId || `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create a clone of the message with the client ID
    const messageWithId = {
      ...message,
      clientMessageId
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      const result = this.sendWithoutQueuing(messageWithId);

      if (result && this.enableRetries) {
        // Add to pending messages for tracking/retry
        this.pendingMessages.set(clientMessageId, {
          message: messageWithId,
          attempts: 0,
          timeout: null,
          clientMessageId,
          createdAt: Date.now()
        });

        // Setup retry mechanism
        this.setupRetry(clientMessageId, this.pendingMessages.get(clientMessageId)!);
      }

      return clientMessageId;
    } else {
      // Queue message if not connected
      this.messageQueue.push(messageWithId);

      if (this.enableRetries) {
        // Add to pending for tracking
        this.pendingMessages.set(clientMessageId, {
          message: messageWithId,
          attempts: 0,
          timeout: null,
          clientMessageId,
          createdAt: Date.now()
        });
      }

      return clientMessageId;
    }
  }

  /**
   * Register a callback for message status updates
   */
  public registerMessageStatusCallback(
    clientMessageId: string,
    callback: (status: string) => void
  ): void {
    this.messageStatusCallbacks.set(clientMessageId, callback);

    // Set up a cleanup timeout for backward compatibility
    setTimeout(() => {
      // If we don't receive a confirmation within 10 seconds, consider it sent anyway
      // This is a fallback for backward compatibility with servers that don't send acks
      const pendingInfo = this.pendingMessages.get(clientMessageId);
      if (pendingInfo) {
        // Only change status if it's not already failed (i.e., max retries reached)
        if (pendingInfo.attempts < this.MAX_RETRY_ATTEMPTS) {
          const statusCallback = this.messageStatusCallbacks.get(clientMessageId);
          if (statusCallback) {
            statusCallback('sent');
          }
        }
      }
    }, 10000);
  }

  /**
   * Subscribe to specific message types
   * Returns a subscription ID that can be used to unsubscribe
   */
  public subscribe(type: string, callback: MessageCallback): string {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.subscriptions.push({ id, type, callback });
    return id;
  }

  /**
   * Unsubscribe from messages
   */
  public unsubscribe(id: string): boolean {
    const initialLength = this.subscriptions.length;
    this.subscriptions = this.subscriptions.filter(sub => sub.id !== id);
    return initialLength !== this.subscriptions.length;
  }

  /**
   * Add connection listener
   */
  public addConnectionListener(callback: ConnectionCallback): void {
    this.connectionCallbacks.push(callback);
  }

  /**
   * Remove connection listener
   */
  public removeConnectionListener(callback: ConnectionCallback): void {
    this.connectionCallbacks = this.connectionCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Add disconnection listener
   */
  public addDisconnectionListener(callback: ConnectionCallback): void {
    this.disconnectionCallbacks.push(callback);
  }

  /**
   * Remove disconnection listener
   */
  public removeDisconnectionListener(callback: ConnectionCallback): void {
    this.disconnectionCallbacks = this.disconnectionCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Add error listener
   */
  public addErrorListener(callback: ErrorCallback): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Remove error listener
   */
  public removeErrorListener(callback: ErrorCallback): void {
    this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Check if the WebSocket is connected
   */
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Close the WebSocket connection
   */
  public close(reason: string = 'User initiated disconnect'): void {
    if (this.ws) {
      this.ws.close(1000, reason);
      this.ws = null;
    }
  }

  /**
   * Setup a heartbeat ping
   */
  public setupHeartbeat(intervalMs: number = 30000): NodeJS.Timeout {
    return setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping' });
      }
    }, intervalMs);
  }

  /**
   * Get pending messages
   */
  public getPendingMessages(): Map<string, RetryInfo> {
    return new Map(this.pendingMessages);
  }

  /**
   * Manually cancel retries for a message
   */
  public cancelRetry(clientMessageId: string): boolean {
    const info = this.pendingMessages.get(clientMessageId);
    if (info && info.timeout) {
      clearTimeout(info.timeout);
      this.pendingMessages.delete(clientMessageId);
      return true;
    }
    return false;
  }
}

export default WebSocketClient;

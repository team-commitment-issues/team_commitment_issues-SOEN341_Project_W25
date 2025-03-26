class MockWebSocketClient {
  private static instance: MockWebSocketClient;
  private connectionCallbacks: (() => void)[] = [];
  private disconnectionCallbacks: (() => void)[] = [];
  private errorCallbacks: ((error: Event) => void)[] = [];
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private _isConnected: boolean = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): MockWebSocketClient {
    if (!MockWebSocketClient.instance) {
      MockWebSocketClient.instance = new MockWebSocketClient();
    }
    return MockWebSocketClient.instance;
  }

  public connect(token: string): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        this._isConnected = true;
        this.connectionCallbacks.forEach(callback => callback());
        resolve();
      }, 0);
    });
  }

  public send(message: any): string {
    // Mock implementation - just return a client ID
    return `client_${Date.now()}_test`;
  }

  public isConnected(): boolean {
    return this._isConnected;
  }

  public addConnectionListener(callback: () => void): void {
    this.connectionCallbacks.push(callback);
  }

  public removeConnectionListener(callback: () => void): void {
    this.connectionCallbacks = this.connectionCallbacks.filter(cb => cb !== callback);
  }

  public addDisconnectionListener(callback: () => void): void {
    this.disconnectionCallbacks.push(callback);
  }

  public removeDisconnectionListener(callback: () => void): void {
    this.disconnectionCallbacks = this.disconnectionCallbacks.filter(cb => cb !== callback);
  }

  public addErrorListener(callback: (error: Event) => void): void {
    this.errorCallbacks.push(callback);
  }

  public removeErrorListener(callback: (error: Event) => void): void {
    this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
  }

  public subscribe(type: string, callback: (data: any) => void): string {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.messageHandlers.set(id, callback);
    return id;
  }

  public unsubscribe(id: string): boolean {
    return this.messageHandlers.delete(id);
  }

  public registerMessageStatusCallback(
    clientMessageId: string,
    callback: (status: string) => void
  ): void {
    // Mock implementation
  }

  public close(): void {
    this._isConnected = false;
    this.disconnectionCallbacks.forEach(callback => callback());
  }

  public setupHeartbeat(): NodeJS.Timeout {
    return setTimeout(() => {}, 1000) as unknown as NodeJS.Timeout;
  }

  // For testing only
  public _mockReceiveMessage(data: any): void {
    this.messageHandlers.forEach(handler => handler(data));
  }

  public _mockDisconnect(): void {
    this._isConnected = false;
    this.disconnectionCallbacks.forEach(callback => callback());
  }

  public _resetInstance(): void {
    this._isConnected = false;
    this.connectionCallbacks = [];
    this.disconnectionCallbacks = [];
    this.errorCallbacks = [];
    this.messageHandlers.clear();
  }
}

export default MockWebSocketClient;

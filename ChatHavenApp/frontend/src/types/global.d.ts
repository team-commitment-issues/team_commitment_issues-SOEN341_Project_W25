// Add Jest-DOM matchers to TypeScript
import '@testing-library/jest-dom';

// Extend the Window interface with any custom properties
declare global {
  interface Window {
    // Add specific browser APIs that might be used in the application
    localStorage: Storage;
    sessionStorage: Storage;

    // WebSocket interface
    WebSocket: typeof WebSocket;

    // Custom properties for your application
    _env?: {
      API_URL: string;
      WS_URL: string;
    };
  }

  // Extend NodeJS namespace for timer IDs
  namespace NodeJS {
    interface Timeout {
      _destroyed?: boolean;
    }

    interface Timer {
      _destroyed?: boolean;
    }
  }

  // Add specific interfaces for mocks
  interface MockWebSocket extends WebSocket {
    mockReceiveMessage(data: any): void;
    mockDisconnect(code?: number, reason?: string): void;
    mockError(message?: string): void;
  }
}

// This keeps TypeScript happy when using import syntax
export { };

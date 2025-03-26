import './jest.polyfills';

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
import '@testing-library/jest-dom';

// Create consistent mock for localStorage that can be used across all tests
const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null)
  };
})();

// Apply mocks to window object
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
});

// Create WebSocket mock that's comprehensive enough for all tests
class MockWebSocket {
  url: string;
  onopen: any = null;
  onclose: any = null;
  onmessage: any = null;
  onerror: any = null;
  readyState = 0;
  CONNECTING = 0;
  OPEN = 1;
  CLOSING = 2;
  CLOSED = 3;
  protocol = '';
  extensions = '';
  bufferedAmount = 0;
  binaryType: 'blob' | 'arraybuffer' = 'blob';

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    if (protocols && typeof protocols === 'string') {
      this.protocol = protocols;
    } else if (protocols && Array.isArray(protocols) && protocols.length > 0) {
      this.protocol = protocols[0];
    }

    // Simulate connection after a brief delay
    setTimeout(() => {
      this.readyState = this.OPEN;
      if (this.onopen) this.onopen({ target: this });
    }, 0);
  }

  send = jest.fn((data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
    // Implementation can be added if needed for specific tests
    return true;
  });

  close = jest.fn((code?: number, reason?: string) => {
    this.readyState = this.CLOSED;
    if (this.onclose) {
      this.onclose({ code: code || 1000, reason: reason || 'Normal closure', wasClean: true });
    }
  });

  // Helper test methods
  mockReceiveMessage(data: any) {
    if (this.onmessage) {
      const messageEvent = {
        data: typeof data === 'string' ? data : JSON.stringify(data),
        origin: this.url,
        lastEventId: '',
        source: null,
        ports: []
      };
      this.onmessage(messageEvent);
    }
  }

  mockDisconnect(code: number = 1006, reason: string = 'Connection closed abnormally') {
    this.readyState = this.CLOSED;
    if (this.onclose) {
      this.onclose({ code, reason, wasClean: code === 1000 });
    }
  }

  mockError(message: string = 'WebSocket error') {
    if (this.onerror) {
      this.onerror({ message, error: new Error(message) });
    }
  }

  addEventListener(type: string, listener: EventListener) {
    if (type === 'open') this.onopen = listener;
    if (type === 'close') this.onclose = listener;
    if (type === 'message') this.onmessage = listener;
    if (type === 'error') this.onerror = listener;
  }

  removeEventListener(type: string, listener: EventListener) {
    if (type === 'open' && this.onopen === listener) this.onopen = null;
    if (type === 'close' && this.onclose === listener) this.onclose = null;
    if (type === 'message' && this.onmessage === listener) this.onmessage = null;
    if (type === 'error' && this.onerror === listener) this.onerror = null;
  }
}

// Apply the WebSocket mock
global.WebSocket = MockWebSocket as any;

// Mock fetch API if needed
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    formData: () => Promise.resolve(new FormData()),
    headers: new Headers(),
    status: 200,
    statusText: 'OK',
    type: 'basic',
    url: 'https://example.com'
  })
);

// Mock timers for consistent behavior
jest.useFakeTimers();

// Silence console errors during tests but in a more granular way
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    const suppressedPatterns = [
      'Warning: ReactDOM.render is no longer supported',
      'Warning: act(...) is not supported',
      'Error: Not implemented: navigation',
      'Warning: An update to %s inside a test was not wrapped in act'
    ];

    // Only suppress specific known warnings
    if (
      args[0] &&
      typeof args[0] === 'string' &&
      suppressedPatterns.some(pattern => args[0].includes(pattern))
    ) {
      return;
    }
    originalConsoleError(...args);
  };

  console.warn = (...args) => {
    const suppressedPatterns = ['Warning: Using UNSAFE_'];

    if (
      args[0] &&
      typeof args[0] === 'string' &&
      suppressedPatterns.some(pattern => args[0].includes(pattern))
    ) {
      return;
    }
    originalConsoleWarn(...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;

  // Clean up any fake timers
  jest.useRealTimers();
});

// Reset mocks and document between tests
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  document.body.innerHTML = '';

  // Reset any mock timers for the next test
  jest.runOnlyPendingTimers();
});

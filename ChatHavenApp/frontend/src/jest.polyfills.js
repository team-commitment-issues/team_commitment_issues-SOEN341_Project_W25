// jest.polyfills.js
/**
 * This file contains polyfills for browser APIs that aren't available in Jest's JSDOM environment.
 * Add any additional polyfills needed for your application here.
 */

// TextEncoder/TextDecoder polyfills
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Fetch API polyfill - Using whatwg-fetch instead of node-fetch
if (typeof global.fetch === 'undefined') {
  // Use a CJS compatible fetch polyfill
  require('whatwg-fetch');
  global.fetch = window.fetch;
  global.Headers = window.Headers;
  global.Request = window.Request;
  global.Response = window.Response;
}

// URL and URLSearchParams polyfills
if (typeof global.URL === 'undefined') {
  const { URL, URLSearchParams } = require('url');
  global.URL = URL;
  global.URLSearchParams = URLSearchParams;
}

// IntersectionObserver and ResizeObserver polyfills
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    return null;
  }
  unobserve() {
    return null;
  }
  disconnect() {
    return null;
  }
}

class MockResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    return null;
  }
  unobserve() {
    return null;
  }
  disconnect() {
    return null;
  }
}

global.IntersectionObserver = global.IntersectionObserver || MockIntersectionObserver;
global.ResizeObserver = global.ResizeObserver || MockResizeObserver;

// Web Crypto API polyfill
if (!global.crypto) {
  const { webcrypto } = require('crypto');
  global.crypto = webcrypto;
}

// setTimeout and clearTimeout should already be defined in Jest,
// but adding these for completeness
global.setTimeout = global.setTimeout || ((fn, ms) => fn());
global.clearTimeout = global.clearTimeout || (() => {});

// setInterval and clearInterval
global.setInterval = global.setInterval || ((fn, ms) => fn());
global.clearInterval = global.clearInterval || (() => {});

// matchMedia polyfill
if (!global.matchMedia) {
  global.matchMedia = jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }));
}

// Mock server-sent events
if (!global.EventSource) {
  global.EventSource = class EventSource {
    constructor(url) {
      this.url = url;
      this.readyState = 0;
      this.CONNECTING = 0;
      this.OPEN = 1;
      this.CLOSED = 2;
    }

    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return true;
    }
    close() {}
  };
}

// Mock Audio API
if (!global.Audio) {
  global.Audio = class Audio {
    constructor(url) {
      this.url = url;
      this.paused = true;
      this.volume = 1;
      this.muted = false;
    }

    pause() {
      this.paused = true;
    }
    play() {
      this.paused = false;
      return Promise.resolve();
    }
    addEventListener() {}
    removeEventListener() {}
  };
}

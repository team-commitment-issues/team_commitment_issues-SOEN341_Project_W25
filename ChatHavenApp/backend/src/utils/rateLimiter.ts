import { createLogger } from './logger';

// Create logger but make it injectable for testing
let loggerInstance = createLogger('RateLimiter');

// Expose a function to replace the logger (for testing)
export function setLogger(logger: any) {
  loggerInstance = logger;
}

interface RateLimitConfig {
  // Maximum messages per window
  maxRequests: number;
  // Time window in milliseconds
  windowMs: number;
  // Whether to log rate limiting events
  verbose: boolean;
}

interface RateLimitTracker {
  count: number;
  resetAt: number;
  blocked: boolean;
}

/**
 * Simple in-memory rate limiter for WebSocket connections
 */
export class RateLimiter {
  private trackers: Map<string, RateLimitTracker> = new Map();
  private config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      maxRequests: config.maxRequests || 100,
      windowMs: config.windowMs || 60000, // Default: 100 requests per minute
      verbose: config.verbose || false
    };

    // Only create the interval when needed, not at construction time
    this.setupCleanupInterval();
  }

  /**
   * Set up the cleanup interval
   */
  private setupCleanupInterval(): void {
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => this.cleanup(), this.config.windowMs * 2);
    }
  }

  /**
   * Clean up resources used by the rate limiter
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Check if a client identified by id is rate limited
   * @param id Client identifier (sessionId, username, etc)
   * @returns Boolean indicating if the client is allowed to proceed
   */
  isAllowed(id: string): boolean {
    // Ensure cleanup interval is running
    this.setupCleanupInterval();

    const now = Date.now();

    // Get or create rate tracker
    let tracker = this.trackers.get(id);
    if (!tracker) {
      tracker = {
        count: 0,
        resetAt: now + this.config.windowMs,
        blocked: false
      };
      this.trackers.set(id, tracker);
    }

    // Reset if window has expired
    if (now >= tracker.resetAt) {
      tracker.count = 0;
      tracker.resetAt = now + this.config.windowMs;
      tracker.blocked = false;
    }

    // Check if already blocked
    if (tracker.blocked) {
      return false;
    }

    // Increment and check
    tracker.count++;

    if (tracker.count > this.config.maxRequests) {
      tracker.blocked = true;

      if (this.config.verbose) {
        loggerInstance.warn('Rate limit exceeded', {
          id,
          maxRequests: this.config.maxRequests,
          windowMs: this.config.windowMs
        });
      }

      return false;
    }

    return true;
  }

  /**
   * Clean up expired trackers to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [id, tracker] of this.trackers.entries()) {
      if (now >= tracker.resetAt + this.config.windowMs) {
        this.trackers.delete(id);
        cleanedCount++;
      }
    }

    if (this.config.verbose && cleanedCount > 0) {
      loggerInstance.debug('Cleaned up rate limiter entries', { count: cleanedCount });
    }
  }
}

// Create a controlled singleton instance
let defaultLimiterInstance: RateLimiter | null = null;

/**
 * Clean up the default rate limiter if it exists
 */
export function shutdownDefaultRateLimiter(): void {
  if (defaultLimiterInstance) {
    defaultLimiterInstance.shutdown();
    defaultLimiterInstance = null;
  }
}

/**
 * Create and get the default rate limiter, with lazy initialization
 */
function getDefaultRateLimiter(): RateLimiter {
  if (!defaultLimiterInstance) {
    defaultLimiterInstance = new RateLimiter({
      maxRequests: 200, // 200 messages per minute
      windowMs: 60000, // 1 minute window
      verbose: true
    });
  }
  return defaultLimiterInstance;
}

const defaultRateLimiterProxy = new Proxy(getDefaultRateLimiter(), {
  apply: function (target, thisArg, argumentsList) {
    // When called as a function, delegate to the instance's isAllowed method
    if (argumentsList.length === 1 && typeof argumentsList[0] === 'string') {
      return getDefaultRateLimiter().isAllowed.apply(target, argumentsList as [string]);
    }
    throw new Error('Invalid arguments passed to defaultRateLimiter');
  },
  get: function (target, prop) {
    if (prop === 'isAllowed') {
      return (...args: [string]) => getDefaultRateLimiter().isAllowed(...args);
    }
    if (prop === 'shutdown') {
      return () => shutdownDefaultRateLimiter();
    }

    // @ts-ignore
    return target[prop];
  }
});

export const defaultRateLimiter = defaultRateLimiterProxy as unknown as RateLimiter &
  ((id: string) => boolean);

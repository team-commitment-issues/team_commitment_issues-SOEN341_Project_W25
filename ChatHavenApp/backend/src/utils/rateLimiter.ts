// utils/rateLimiter.ts
import { createLogger } from './logger';

const logger = createLogger('RateLimiter');

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

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      maxRequests: config.maxRequests || 100,
      windowMs: config.windowMs || 60000, // Default: 100 requests per minute
      verbose: config.verbose || false
    };

    // Periodically clean up expired trackers
    setInterval(() => this.cleanup(), this.config.windowMs * 2);
  }

  /**
   * Check if a client identified by id is rate limited
   * @param id Client identifier (sessionId, username, etc)
   * @returns Boolean indicating if the client is allowed to proceed
   */
  isAllowed(id: string): boolean {
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
        logger.warn('Rate limit exceeded', {
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
      logger.debug('Cleaned up rate limiter entries', { count: cleanedCount });
    }
  }
}

// Export a singleton instance with default settings
export const defaultRateLimiter = new RateLimiter({
  maxRequests: 200,  // 200 messages per minute
  windowMs: 60000,   // 1 minute window
  verbose: true
});
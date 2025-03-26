// src/utils/httpRateLimiter.ts
import { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';

// Create and export default rate limiter with proper typing
export const createHttpRateLimiter = (
  options: {
    windowMs?: number;
    max?: number;
    message?: string;
  } = {}
) => {
  const limiter = rateLimit({
    windowMs: options.windowMs || 30 * 1000, // Default: 30 seconds
    max: options.max || 30 * 5, // Default: 150 requests per 30 seconds
    standardHeaders: true,
    legacyHeaders: false,
    message: options.message || 'Too many requests, please try again later.'
  });

  // Cast to RequestHandler to fix TypeScript compatibility issues
  return limiter as unknown as RequestHandler;
};

// Export a pre-configured instance with default settings
export const defaultHttpRateLimiter = createHttpRateLimiter();

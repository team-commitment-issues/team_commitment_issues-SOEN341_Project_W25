// routes/metricsRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';
import WebSocketMetrics from '../utils/metrics';

const logger = createLogger('MetricsRoutes');

/**
 * Authentication middleware for metrics endpoints
 * In production, requires an API key
 */
const authenticateMetricsRequest = (req: Request, res: Response, next: NextFunction) => {
  // In development, allow access without API key
  if (process.env.NODE_ENV !== 'production') {
    next();
    return;
  }

  const apiKey = req.headers['x-api-key'];
  const metricsApiKey = process.env.METRICS_API_KEY;

  // Verify API key is configured
  if (!metricsApiKey) {
    logger.warn('METRICS_API_KEY environment variable not set');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  // Verify API key is correct
  if (!apiKey || apiKey !== metricsApiKey) {
    logger.warn('Unauthorized metrics access attempt', {
      ip: req.ip,
      path: req.path
    });
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
};

/**
 * Creates a router for WebSocket metrics endpoints
 * @param metrics WebSocketMetrics instance
 * @returns Express router
 */
export const createMetricsRouter = (metrics: WebSocketMetrics) => {
  const router = express.Router();

  // Apply authentication middleware to all routes
  router.use(authenticateMetricsRequest);

  // GET /api/metrics - Full metrics
  router.get('/', (req: Request, res: Response) => {
    try {
      const data = metrics.getMetrics();
      res.json(data);
    } catch (error) {
      logger.error('Error retrieving metrics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
  });

  // GET /api/metrics/summary - Condensed metrics summary
  router.get('/summary', (req: Request, res: Response) => {
    try {
      const fullMetrics = metrics.getMetrics();

      // Create a condensed summary
      const summary = {
        timestamp: fullMetrics.timestamp,
        uptime: fullMetrics.uptime,
        connections: fullMetrics.connections,
        messages: {
          received: fullMetrics.messages.totals.messagesReceived,
          sent: fullMetrics.messages.totals.messagesSent,
          perSecond: fullMetrics.messages.rates.messagesPerSecond
        },
        errors: fullMetrics.errors,
        system: {
          memoryUsageMB: Math.round(fullMetrics.system.memoryUsage.rss / (1024 * 1024)),
          cpuLoad: fullMetrics.system.cpuLoad
        }
      };

      res.json(summary);
    } catch (error) {
      logger.error('Error retrieving metrics summary', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({ error: 'Failed to retrieve metrics summary' });
    }
  });

  // GET /api/metrics/connections - Connection details
  router.get('/connections', (req: Request, res: Response) => {
    try {
      const fullMetrics = metrics.getMetrics();
      res.json(fullMetrics.connectionDetails);
    } catch (error) {
      logger.error('Error retrieving connection metrics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({ error: 'Failed to retrieve connection metrics' });
    }
  });

  // GET /api/metrics/messages - Message statistics
  router.get('/messages', (req: Request, res: Response) => {
    try {
      const fullMetrics = metrics.getMetrics();
      res.json(fullMetrics.messages);
    } catch (error) {
      logger.error('Error retrieving message metrics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({ error: 'Failed to retrieve message metrics' });
    }
  });

  // GET /api/metrics/system - System resource usage
  router.get('/system', (req: Request, res: Response) => {
    try {
      const fullMetrics = metrics.getMetrics();
      res.json(fullMetrics.system);
    } catch (error) {
      logger.error('Error retrieving system metrics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({ error: 'Failed to retrieve system metrics' });
    }
  });

  // GET /api/metrics/trends - Historical data and trends
  router.get('/trends', (req: Request, res: Response) => {
    try {
      const fullMetrics = metrics.getMetrics();
      res.json(fullMetrics.trends);
    } catch (error) {
      logger.error('Error retrieving trend metrics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      res.status(500).json({ error: 'Failed to retrieve trend metrics' });
    }
  });

  return router;
};

export default createMetricsRouter;

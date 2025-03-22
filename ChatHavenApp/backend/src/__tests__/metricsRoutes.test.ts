// tests/routes/metricsRoutes.test.ts
import { createMetricsRouter } from '../routes/metricsRoutes';
import WebSocketMetrics from '../utils/metrics';
import express from 'express';
import request from 'supertest';

// Mock dependencies
jest.mock('../utils/metrics');
jest.mock('../utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('Metrics Routes', () => {
  let app: express.Application;
  let mockMetrics: jest.Mocked<WebSocketMetrics>;
  
  beforeEach(() => {
    // Create mock metrics
    mockMetrics = {
      getMetrics: jest.fn(),
      trackMessage: jest.fn(),
      stop: jest.fn()
    } as unknown as jest.Mocked<WebSocketMetrics>;
    
    // Set up mock metrics data
    mockMetrics.getMetrics.mockReturnValue({
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: 3600,
        formatted: '1h 0m 0s'
      },
      connections: {
        current: 10,
        total: 50,
        peak: 25
      },
      errors: 5,
      messages: {
        totals: {
          messagesReceived: 1000,
          messagesSent: 950,
          total: 1950
        },
        rates: {
          messagesPerSecond: 0.54
        }
      },
      connectionDetails: {
        teamStats: { totalTeams: 3 },
        channelStats: { totalChannels: 10 },
        userStats: { totalUsers: 20 }
      },
      system: {
        memoryUsage: {
          rss: 100 * 1024 * 1024 // 100 MB
        },
        cpuLoad: [1.0, 0.8, 0.6]
      },
      trends: {
        hourlyData: [
          { timestamp: Date.now(), connections: 10, messagesReceived: 500 }
        ]
      }
    });
    
    // Create express app
    app = express();
    
    // Add metrics router
    app.use('/api/metrics', createMetricsRouter(mockMetrics));
    
    // Set NODE_ENV for testing
    process.env.NODE_ENV = 'development';
  });
  
  afterEach(() => {
    // Reset environment
    delete process.env.NODE_ENV;
    delete process.env.METRICS_API_KEY;
  });
  
  test('should return full metrics from root endpoint', async () => {
    const response = await request(app).get('/api/metrics');
    
    expect(response.status).toBe(200);
    expect(mockMetrics.getMetrics).toHaveBeenCalled();
    expect(response.body).toHaveProperty('connections');
    expect(response.body).toHaveProperty('messages');
    expect(response.body).toHaveProperty('system');
  });
  
  test('should return summary from summary endpoint', async () => {
    const response = await request(app).get('/api/metrics/summary');
    
    expect(response.status).toBe(200);
    expect(mockMetrics.getMetrics).toHaveBeenCalled();
    expect(response.body).toHaveProperty('connections');
    expect(response.body).toHaveProperty('messages');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('errors');
    
    // Should be more concise than full metrics
    expect(Object.keys(response.body).length).toBeLessThan(Object.keys(mockMetrics.getMetrics()).length);
  });
  
  test('should return connection details from connections endpoint', async () => {
    const response = await request(app).get('/api/metrics/connections');
    
    expect(response.status).toBe(200);
    expect(mockMetrics.getMetrics).toHaveBeenCalled();
    expect(response.body).toEqual(mockMetrics.getMetrics().connectionDetails);
  });
  
  test('should return message stats from messages endpoint', async () => {
    const response = await request(app).get('/api/metrics/messages');
    
    expect(response.status).toBe(200);
    expect(mockMetrics.getMetrics).toHaveBeenCalled();
    expect(response.body).toEqual(mockMetrics.getMetrics().messages);
  });
  
  test('should return system stats from system endpoint', async () => {
    const response = await request(app).get('/api/metrics/system');
    
    expect(response.status).toBe(200);
    expect(mockMetrics.getMetrics).toHaveBeenCalled();
    expect(response.body).toEqual(mockMetrics.getMetrics().system);
  });
  
  test('should return trend data from trends endpoint', async () => {
    const response = await request(app).get('/api/metrics/trends');
    
    expect(response.status).toBe(200);
    expect(mockMetrics.getMetrics).toHaveBeenCalled();
    expect(response.body).toEqual(mockMetrics.getMetrics().trends);
  });
  
  test('should handle errors gracefully', async () => {
    // Mock getMetrics to throw an error
    mockMetrics.getMetrics.mockImplementation(() => {
      throw new Error('Test error');
    });
    
    const response = await request(app).get('/api/metrics');
    
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
  
  test('should require API key in production environment', async () => {
    // Set production environment
    process.env.NODE_ENV = 'production';
    process.env.METRICS_API_KEY = 'test-api-key';
    
    // No API key
    const responseNoKey = await request(app).get('/api/metrics');
    expect(responseNoKey.status).toBe(401);
    
    // Wrong API key
    const responseWrongKey = await request(app)
      .get('/api/metrics')
      .set('x-api-key', 'wrong-key');
    expect(responseWrongKey.status).toBe(401);
    
    // Correct API key
    const responseCorrectKey = await request(app)
      .get('/api/metrics')
      .set('x-api-key', 'test-api-key');
    expect(responseCorrectKey.status).toBe(200);
  });
  
  test('should return server error if no API key is configured in production', async () => {
    // Set production environment without API key
    process.env.NODE_ENV = 'production';
    delete process.env.METRICS_API_KEY;
    
    const response = await request(app).get('/api/metrics');
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Server configuration error');
  });
});
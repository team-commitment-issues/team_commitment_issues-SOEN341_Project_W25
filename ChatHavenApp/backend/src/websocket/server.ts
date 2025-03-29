import { WebSocketServer, WebSocket } from 'ws';
import { createLogger } from '../utils/logger';
import { ExtendedWebSocket } from '../types/websocket';
import ClientHealthChecker from '../services/clientHealthChecker';
import WebSocketMetrics from '../utils/metrics';
import ConnectionManager from '../services/connectionManager';
import { handleWebSocketMessage } from './router';
import { verifyToken } from './middleware/authMiddleware';
import { CONFIG } from './constants';
import OnlineStatusService from '../services/onlineStatusService';
import { handleDisconnection } from './utils/connectionUtils';
import { defaultRateLimiter } from '../utils/rateLimiter';
import { Schema } from 'mongoose';

// Setup structured logging
const logger = createLogger('WebSocketServer');

/**
 * Sets up WebSocket server
 */
export const setupWebSocketServer = async (server: any): Promise<WebSocketServer> => {
    const wss = new WebSocketServer({
        server,
        maxPayload: CONFIG.MAX_PAYLOAD_SIZE,
        perMessageDeflate: {
            zlibDeflateOptions: {
                chunkSize: 1024,
                memLevel: 7,
                level: 3
            },
            zlibInflateOptions: {
                chunkSize: 10 * 1024
            },
            threshold: 1024 // Only compress messages larger than 1KB
        }
    });

    // Set up connection manager
    const connectionManager = new ConnectionManager(wss);

    // Set up client health checker
    const healthChecker = new ClientHealthChecker(wss);
    healthChecker.start();

    // Set up metrics collection
    const metrics = new WebSocketMetrics(wss);

    // Create a simple API endpoint for metrics (if in development mode)
    if (process.env.NODE_ENV !== 'production') {
        server.on('request', (req: any, res: any) => {
            if (req.url === '/api/ws-metrics' && req.method === 'GET') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(metrics.getMetrics(), null, 2));
            }
        });
    }

    // Generate unique session IDs for connections
    let connectionCounter = 0;

    wss.on('connection', async (ws: ExtendedWebSocket, req) => {
        const sessionId = `session_${Date.now()}_${++connectionCounter}`;
        ws.sessionId = sessionId;
        ws.lastActivity = new Date();

        // Set up health check ping/pong for this client
        healthChecker.setupClient(ws);

        // Track the new connection
        connectionManager.trackConnection(ws);

        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const token = url.searchParams.get('token') as string;

        logger.info('WebSocket connection established', {
            sessionId,
            ip: req.socket.remoteAddress
        });

        if (!token) {
            logger.warn('No token provided', { sessionId });
            ws.close(1000, 'No token provided');
            return;
        }

        try {
            const user = await verifyToken(token);
            logger.info('User authenticated', {
                sessionId,
                userId: user._id,
                username: user.username
            });

            // Store user reference in WebSocket object
            ws.user = user;

            // Check for concurrent connection limits
            let concurrentConnections = 0;
            wss.clients.forEach(client => {
                const extClient = client as ExtendedWebSocket;
                if (extClient.user && extClient.user.username === user.username) {
                    concurrentConnections++;
                }
            });

            if (concurrentConnections > CONFIG.MAX_CONCURRENT_CONNECTIONS_PER_USER) {
                logger.warn('Too many concurrent connections', {
                    username: user.username,
                    connections: concurrentConnections,
                    sessionId
                });
                ws.send(
                    JSON.stringify({
                        type: 'error',
                        message: 'Too many concurrent connections'
                    })
                );
                ws.close(4000, 'Too many concurrent connections');
                return;
            }

            // Track user connection
            await OnlineStatusService.trackUserConnection(user._id as Schema.Types.ObjectId, user.username);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            logger.error('Authentication error', { sessionId, error: errorMessage });
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
            ws.close(1000, 'Invalid token');
            return;
        }

        ws.on('message', async data => {
            try {
                // Apply rate limiting
                if (!ws.user || !defaultRateLimiter.isAllowed(ws.user.username)) {
                    logger.warn('Rate limit exceeded', {
                        sessionId,
                        username: ws.user?.username
                    });
                    ws.send(
                        JSON.stringify({
                            type: 'error',
                            message: 'Message rate limit exceeded. Please slow down.'
                        })
                    );
                    return;
                }

                const messageStr = data.toString();
                const message = JSON.parse(messageStr);

                logger.debug('Received message', {
                    sessionId,
                    type: message.type,
                    size: messageStr.length
                });

                // Route the message to the appropriate handler
                await handleWebSocketMessage(ws, message, wss, token);
            } catch (error) {
                logger.error('Message handling error', {
                    sessionId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                ws.send(
                    JSON.stringify({
                        type: 'error',
                        message: 'Message handling error'
                    })
                );
            }
        });

        ws.on('close', async (code, reason) => {
            logger.info('WebSocket connection closed', {
                sessionId,
                code,
                reason: reason.toString()
            });

            if (ws.user) {
                await OnlineStatusService.trackUserDisconnection(ws.user._id as Schema.Types.ObjectId, ws.user.username);

                try {
                    await handleDisconnection(ws.user._id as Schema.Types.ObjectId, ws.user.username, wss);
                } catch (error) {
                    logger.error('Error handling disconnection', {
                        sessionId,
                        userId: ws.user._id,
                        username: ws.user.username,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
        });

        ws.on('error', error => {
            logger.error('WebSocket error', {
                sessionId,
                error: error.message
            });
        });
    });

    return wss;
};
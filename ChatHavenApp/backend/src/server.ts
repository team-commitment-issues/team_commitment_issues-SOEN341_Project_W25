import dotenv from 'dotenv';
dotenv.config();

import http from 'http';

import express from 'express';
import mongoose, { Schema, set, Types } from 'mongoose';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import channelRoutes from './routes/channelRoutes';
import superAdminRoutes from './routes/superAdminRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import directMessageRoutes from './routes/directMessageRoutes';
import onlineStatusRoutes from './routes/onlineStatusRoutes';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { setupWebSocketServer } from './webSocketServer';
import scheduleStatusCleanup from './statusCleanup';

// Verify critical environment variables early
const REQUIRED_ENV_VARS = ['JWT_SECRET', 'MONGO_URI'];
const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`Error: Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Log successful loading of JWT_SECRET without revealing its value
console.log('JWT_SECRET loaded successfully.');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chathavendb';

mongoose.connect(MONGO_URI).then(() => {
    console.log('Connected to ' + MONGO_URI);
}).catch((err) => {
    console.log(err);
});

const backend = express();

backend.use(express.json());
backend.use(cors());
backend.use(express.static(path.join(__dirname, '../', '../', './frontend', './build')));

const limiter = rateLimit({
  windowMs: 30 * 1000,
  max: 30 * 5,
});

backend.use(limiter);

backend.use('/user', userRoutes);
backend.use('/channel', channelRoutes);
backend.use('/superadmin', superAdminRoutes);
backend.use('/dashboard', dashboardRoutes);
backend.use('/directMessage', directMessageRoutes);
backend.use('/onlineStatus', onlineStatusRoutes);

const PORT = process.env.PORT || 5000;
const server = http.createServer(backend);

// Start the server and then setup WebSocket properly
server.listen(PORT, async () => {
    console.log('Backend is listening on port ' + PORT);

    try {
        const wss = await setupWebSocketServer(server);
        console.log('WebSocket server initialized successfully');
    } catch (error) {
        console.error('Failed to initialize WebSocket server:', error);
    }

    scheduleStatusCleanup();
});

backend.get("*", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "../",
            "../",
            "./frontend",
            "./build",
            "index.html"
        )
    );
});
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
import path from 'path';
import rateLimit from 'express-rate-limit';
import { setupWebSocketServer } from './webSocketServer';


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
  windowMs: 15 * 60 * 1000,
  max: 100,
});

// backend.use(limiter);

backend.use('/user', userRoutes);
backend.use('/channel', channelRoutes);
backend.use('/superadmin', superAdminRoutes);
backend.use('/dashboard', dashboardRoutes);

const PORT = process.env.PORT || 5000;
const server = http.createServer(backend);

server.listen(PORT, () => {
    console.log('Backend is listening on port ' + PORT);
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

setupWebSocketServer(server);
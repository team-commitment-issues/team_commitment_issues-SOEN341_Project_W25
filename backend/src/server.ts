import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import channelRoutes from './routes/channelRoutes';
import path from 'path';

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

backend.use('/user', userRoutes);
backend.use('/channel', channelRoutes);

const PORT = process.env.PORT || 5000;

backend.listen(PORT, () => {
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
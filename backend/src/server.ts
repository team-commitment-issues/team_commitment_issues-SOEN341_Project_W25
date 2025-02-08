import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import userRoutes from './routes/userRoutes';
import channelRoutes from './routes/channelRoutes';
import path from 'path';

mongoose.connect('mongodb://127.0.0.1:27017/', {
    dbName: 'chathavendb',
}).then(() => {
    console.log('Connected to ChatHaven Database');
}).catch((err) => {
    console.log(err);
});

const backend = express();

backend.use(express.json());
backend.use(cors());
backend.use(express.static(path.join(__dirname, '../', '../', './frontend', './build')));

backend.use('/user', userRoutes);
backend.use('/channel', channelRoutes);

backend.listen(5000, () => {
    console.log('Backend is listening on port 5000');
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
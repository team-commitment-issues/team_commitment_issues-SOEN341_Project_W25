import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import userRoutes from './routes/userRoutes';

mongoose.connect('mongodb://localhost:27017/', {
    dbName: 'chathavendb',
}).then(() => {
    console.log('Connected to ChatHaven Database');
}).catch((err) => {
    console.log(err);
});

const backend = express();

backend.use(express.json());
backend.use(cors());

backend.use('/user', userRoutes);

backend.listen(5000, () => {
    console.log('Backend is listening on port 5000');
});
import express, { Request, Response } from 'express';
import mongoose, { Schema, model, Document } from 'mongoose';
import cors from 'cors';

mongoose.connect('mongodb://localhost:27017/', {
    dbName: 'chathavendb',
}).then(() => {
    console.log('Connected to ChatHaven Database');
}).catch((err) => {
    console.log(err);
});

interface IUser extends Document{
    username: string;
    email: string;
    password: string;
    date: Date;
}

const UserSchema = new Schema<IUser>({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: false,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
});
const User = model<IUser>('User', UserSchema);
User.createIndexes(); // More read operations than write operations (Better time complexity)

const backend = express();

backend.use(express.json());
backend.use(cors());

backend.get('/', (req: Request, res: Response) => {
    res.send('Backend is running');
});

backend.post('/register', async (req: Request, res: Response) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.status(201).send('User registered successfully');
    } catch (err) {
        if ((err as any).code === 11000) {
            const field = Object.keys((err as any).keyValue)[0];
            if (field === 'username') {
                res.status(400).send('Username already exists');
            } else if (field === 'email') {
                res.status(400).send('Email already exists');
            } else {
                res.status(500).send('An error occurred');
            }
        } else {
            res.status(500).send('Something went wrong');
        }
        console.log(err);
    }

        
});
backend.listen(5000, () => {
    console.log('Backend is listening on port 5000');
});
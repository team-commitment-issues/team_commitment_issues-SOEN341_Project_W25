import request from 'supertest';
import express from 'express';
import userRoutes from '../src/routes/userRoutes';

const app = express();
app.use(express.json());
app.use('/user', userRoutes);

describe('POST /user/register', () => {
    it('should register a new user successfully', async () => {
        const newUser = {
            username: 'testuser',
            email: 'test@user.com',
            password: 'testpassword',
            date: Date.now(),
        };

        const response = await request(app)
            .post('/user/register')
            .send(newUser)
            .expect(201);

        expect(response.body.message).toBe('User registered successfully');
    });

    it('should return an error if the email is already taken', async () => {
        const existingUser = {
            username: 'existinguser',
            email: 'existing@user.com',
            password: 'existingpassword',
            date: Date.now(),
        };

        const newUser = {
            username: 'testuser2',
            email: 'existing@user.com',
            password: 'testpassword',
            date: Date.now(),
        };
    
        await request(app)
            .post('/user/register')
            .send(existingUser)
            .expect(201);

        await new Promise((resolve) => setTimeout(resolve, 100));
        
        const response = await request(app)
            .post('/user/register')
            .send(newUser)
            .expect(400);

        expect(response.body.error).toBe('Email already exists');
    });
});
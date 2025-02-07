import request from 'supertest';
import express from 'express';
import userRoutes from '../src/routes/userRoutes';

const app = express();
app.use(express.json());
app.use('/user', userRoutes);

describe('POST /user/login', () => {
    it('should register a new user successfully', async () => {
        const newUser = {
            email: 'test@user.com',
            password: 'testpassword',
            firstName: 'Test',
            lastName: 'User',
            userID: 'testuser',
        };

        const response = await request(app)
            .post('/user/signUp')
            .send(newUser)
            .expect(201);

        expect(response.body.message).toBe('User registered successfully');
    });

    it('should return an error if the email is already taken', async () => {
        const Test2User1 = {
            email: 'john@doe.com',
            password: 'testpassword',
            firstName: 'John',
            lastName: 'Doe',
            userID: 'johndoe',
        };

        const Test2User2 = {
            email: 'john@doe.com',
            password: 'testpassword',
            firstName: 'Jane',
            lastName: 'Doe',
            userID: 'janedoe',
        };
    
        await request(app)
            .post('/user/signUp')
            .send(Test2User1)
            .expect(201);

        await new Promise((resolve) => setTimeout(resolve, 100));
        
        const response = await request(app)
            .post('/user/SignUp')
            .send(Test2User2)
            .expect(400);

        expect(response.body.error).toBe('Email already exists');
    });

    it('should return an error if the username is already taken', async () => {
        const Test3User1 = {
            email: 'john@doe.com',
            password: 'testpassword',
            firstName: 'John',
            lastName: 'Doe',
            userID: 'johndoe',
        };

        const Test3User2 = {
            email: 'jane@doe.com',
            password: 'testpassword',
            firstName: 'Jane',
            lastName: 'Doe',
            userID: 'johndoe',
        };
    
        await request(app)
            .post('/user/signUp')
            .send(Test3User1)
            .expect(201);

        await new Promise((resolve) => setTimeout(resolve, 100));

        const response = await request(app)
            .post('/user/signUp')
            .send(Test3User2)
            .expect(400);

        expect(response.body.error).toBe('userID already exists');
    });
});
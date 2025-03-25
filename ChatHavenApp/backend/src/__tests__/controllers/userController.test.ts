import request from 'supertest';
import express from 'express';
import userRoutes from '../../routes/userRoutes';
import TestHelpers from '../testHelpers';
import { Role } from '../../enums';

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
            username: 'testuser',
        };

        const response = await request(app)
            .post('/user/signUp')
            .send(newUser)
            .expect(201);

        expect(response.body.message).toBe('User registered successfully');
    });

    it('should return an error if the email is already taken', async () => {
        const testUser1 = await TestHelpers.createTestUser('john@doe.com', 'testpassword', 'John', 'Doe', 'johndoe', Role.USER, []);

        const testUser2 = {
            email: 'john@doe.com',
            password: 'testpassword',
            firstName: 'Jane',
            lastName: 'Doe',
            username: 'janedoe',
        };

        const response = await request(app)
            .post('/user/SignUp')
            .send(testUser2)
            .expect(400);

        expect(response.body.error).toBe('Email already exists');
    });

    it('should return an error if the username is already taken', async () => {
        const testUser1 = await TestHelpers.createTestUser('john@doe.com', 'testpassword', 'John', 'Doe', 'johndoe', Role.USER, []);

        const testUser2 = {
            email: 'jane@doe.com',
            password: 'testpassword',
            firstName: 'Jane',
            lastName: 'Doe',
            username: 'johndoe',
        };

        const response = await request(app)
            .post('/user/signUp')
            .send(testUser2)
            .expect(400);

        expect(response.body.error).toBe('UserID already exists');
    });

    it('should log in a user successfully if the credentials are correct', async () => {
        const testpassword: string = 'testpassword';
        const testUser = await TestHelpers.createTestUser('test@test.com', testpassword, 'Test', 'User', 'testuser', Role.USER, []);

        const response = await request(app)
            .post('/user/login')
            .send({ username: testUser.username, password: testpassword })
            .expect(200);


        expect(response.body.message).toBe('User logged in successfully');
        expect(response.body.token).toBeDefined();
    });

    it('should return an error if the credentials are incorrect', async () => {
        const testpassword = 'testpassword';
        const testUser = await TestHelpers.createTestUser('test@test.com', testpassword, 'Test', 'User', 'testuser', Role.USER, []);

        const response = await request(app)
            .post('/user/login')
            .send({ username: testUser.username, password: 'wrongpassword' })
            .expect(400);

        expect(response.body.error).toBe('Incorrect password');

        const response2 = await request(app)
            .post('/user/login')
            .send({ username: 'wrongusername', password: testpassword })
            .expect(404);

        expect(response2.body.error).toBe('User not found');

        const response3 = await request(app)
            .post('/user/login')
            .send({ username: 'wrongusername', password: 'wrongpassword' })
            .expect(404);

        expect(response3.body.error).toBe('User not found');
    });
});
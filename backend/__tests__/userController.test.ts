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

    it('should return an error if the userID is already taken', async () => {
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

    it('should log in a user successfully if the credentials are correct', async () => {
        const Test4User = {
            email: 'george@doe.com',
            password: 'testpassword',
            firstName: 'George',
            lastName: 'Doe',
            userID: 'georgedoe',
        };

        await request(app)
            .post('/user/signUp')
            .send(Test4User)
            .expect(201);

        await new Promise((resolve) => setTimeout(resolve, 100));

        const response = await request(app)
            .post('/user/login')
            .send({ userID: Test4User.userID, password: Test4User.password })
            .expect(200);

        expect(response.body.message).toBe('User logged in successfully');
        expect(response.body.token).toBeTruthy();
    });

    it('should return an error if the credentials are incorrect', async () => {
        const Test5User = {
            email: 'may@doe.com',
            password: 'testpassword',
            firstName: 'May',
            lastName: 'Doe',
            userID: 'maydoe',
        };

        await request(app)
            .post('/user/signUp')
            .send(Test5User)
            .expect(201);

        await new Promise((resolve) => setTimeout(resolve, 100));

        const response = await request(app)
            .post('/user/login')
            .send({ userID: Test5User.userID, password: 'wrongpassword' })
            .expect(500);

        expect(response.body.error).toBe('Internal server error');

        const response2 = await request(app)
            .post('/user/login')
            .send({ userID: 'wronguserID', password: Test5User.password })
            .expect(500);

        expect(response2.body.error).toBe('Internal server error');

        const response3 = await request(app)
            .post('/user/login')
            .send({ userID: 'wronguserID', password: 'wrongpassword' })
            .expect(500);

        expect(response3.body.error).toBe('Internal server error');
    });
});
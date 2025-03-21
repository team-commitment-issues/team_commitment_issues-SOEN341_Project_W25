import request from 'supertest';
import express from 'express';
import userRoutes from '../routes/userRoutes';
import authenticate from '../middlewares/authMiddleware';
import TestHelpers from './testHelpers';
import { Role } from '../enums';
import User from '../models/User';
import bcrypt from 'bcrypt';

const app = express();
app.use(express.json());
app.use('/user', authenticate, userRoutes);

TestHelpers.addConnectionHooks(describe);

beforeAll(async () => {
    await TestHelpers.cleanDatabase();
});

afterAll(async () => {
    await TestHelpers.disconnectMongoose();
});

describe('POST /user/update-username', () => {
    it('should update the username for the authenticated user', async () => {
        const user = await TestHelpers.createTestUser(
            'update-user@user.com', 
            'testpassword', 
            'Update', 
            'User', 
            'originalusername', 
            Role.USER, 
            []
        );

        const token = await TestHelpers.generateToken(user.username, user.email);
        
        const response = await request(app)
            .post('/user/update-username')
            .set('Authorization', `Bearer ${token}`)
            .send({
                oldUsername: 'originalusername',
                newUsername: 'newusername',
                password: 'testpassword'
            })
            .expect(200);

        expect(response.body.message).toBe('Username updated successfully');
        
        const updatedUser = await User.findById(user._id);
        expect(updatedUser?.username).toBe('newusername');
    });

    it('should return an error if the user is not authenticated', async () => {
        const response = await request(app)
            .post('/user/update-username')
            .send({
                oldUsername: 'originalusername',
                newUsername: 'newusername',
                password: 'testpassword'
            })
            .expect(401);

        expect(response.body.error).toBe('Unauthorized: No token provided');
    });

    it('should return an error if the old username is not found', async () => {
        const user = await TestHelpers.createTestUser(
            'notfound@user.com', 
            'testpassword', 
            'Not', 
            'Found', 
            'existingusername', 
            Role.USER, 
            []
        );

        const token = await TestHelpers.generateToken(user.username, user.email);
        
        const response = await request(app)
            .post('/user/update-username')
            .set('Authorization', `Bearer ${token}`)
            .send({
                oldUsername: 'nonexistentusername',
                newUsername: 'newusername',
                password: 'testpassword'
            })
            .expect(404);

        expect(response.body.error).toBe('User not found');
    });

    it('should return an error if the password is incorrect', async () => {
        const user = await TestHelpers.createTestUser(
            'wrongpass@user.com', 
            'correctpassword', 
            'Wrong', 
            'Pass', 
            'username', 
            Role.USER, 
            []
        );

        const token = await TestHelpers.generateToken(user.username, user.email);
        
        const response = await request(app)
            .post('/user/update-username')
            .set('Authorization', `Bearer ${token}`)
            .send({
                oldUsername: 'username',
                newUsername: 'newusername',
                password: 'wrongpassword'
            })
            .expect(400);

        expect(response.body.error).toBe('Incorrect password');
    });

    it('should return an error if the new username already exists', async () => {
        const firstUser = await TestHelpers.createTestUser(
            'first@user.com', 
            'testpassword', 
            'First', 
            'User', 
            'firstusername', 
            Role.USER, 
            []
        );

        const secondUser = await TestHelpers.createTestUser(
            'second@user.com', 
            'testpassword', 
            'Second', 
            'User', 
            'secondusername', 
            Role.USER, 
            []
        );

        const token = await TestHelpers.generateToken(firstUser.username, firstUser.email);
        
        const response = await request(app)
            .post('/user/update-username')
            .set('Authorization', `Bearer ${token}`)
            .send({
                oldUsername: 'firstusername',
                newUsername: 'secondusername',
                password: 'testpassword'
            })
            .expect(400);

        expect(response.body.error).toBe('Username already exists');
    });
});

describe('POST /user/update-password', () => {
    it('should update the password for the authenticated user', async () => {
        const user = await TestHelpers.createTestUser(
            'password@user.com', 
            'oldpassword', 
            'Password', 
            'User', 
            'passworduser', 
            Role.USER, 
            []
        );

        const token = await TestHelpers.generateToken(user.username, user.email);
        
        const response = await request(app)
            .post('/user/update-password')
            .set('Authorization', `Bearer ${token}`)
            .send({
                oldPassword: 'oldpassword',
                newPassword: 'newpassword123!'
            })
            .expect(200);

        expect(response.body.message).toBe('Password updated successfully');
        
        const updatedUser = await User.findById(user._id);
        const passwordMatch = await bcrypt.compare('newpassword123!', updatedUser!.password);
        expect(passwordMatch).toBe(true);
    });

    it('should return an error if the user is not authenticated', async () => {
        const response = await request(app)
            .post('/user/update-password')
            .send({
                oldPassword: 'oldpassword',
                newPassword: 'newpassword'
            })
            .expect(401);

        expect(response.body.error).toBe('Unauthorized: No token provided');
    });

    it('should return an error if the old password is incorrect', async () => {
        const user = await TestHelpers.createTestUser(
            'correct@user.com', 
            'correctpassword', 
            'Correct', 
            'User', 
            'correctuser', 
            Role.USER, 
            []
        );

        const token = await TestHelpers.generateToken(user.username, user.email);
        
        const response = await request(app)
            .post('/user/update-password')
            .set('Authorization', `Bearer ${token}`)
            .send({
                oldPassword: 'incorrectpassword',
                newPassword: 'newpassword123!'
            })
            .expect(400);

        expect(response.body.error).toBe('Incorrect password');
    });
});
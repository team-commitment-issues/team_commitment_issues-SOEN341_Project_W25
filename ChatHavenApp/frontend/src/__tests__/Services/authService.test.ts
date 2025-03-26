import axios from 'axios';
import { login, signUp, updateUsername, updatePassword } from '../../Services/authService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('login', () => {
    it('calls API with correct parameters and returns token', async () => {
      // Mock successful response
      const mockResponse = { data: { token: 'test-token' } };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      // Call login function
      const result = await login('testuser', 'password123');

      // Verify axios was called correctly
      expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:5000/user/login', {
        username: 'testuser',
        password: 'password123'
      });

      // Verify correct result is returned
      expect(result).toEqual({ token: 'test-token' });
    });

    it('throws error on API failure', async () => {
      // Mock error response
      const errorResponse = {
        response: {
          data: { error: 'Invalid credentials' }
        }
      };
      mockedAxios.post.mockRejectedValueOnce(errorResponse);

      // Verify error is thrown
      await expect(login('testuser', 'wrongpass')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('signUp', () => {
    it('calls API with correct parameters and returns user data', async () => {
      // Mock successful response
      const mockResponse = {
        data: {
          user: {
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            username: 'testuser'
          }
        }
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      // Call signUp function
      const result = await signUp('test@example.com', 'password123', 'Test', 'User', 'testuser');

      // Verify axios was called correctly
      expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:5000/user/signup', {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser'
      });

      // Verify correct result is returned
      expect(result).toEqual(mockResponse.data);
    });

    it('throws error on API failure', async () => {
      // Mock error response
      const errorResponse = {
        response: {
          data: { error: 'Email already exists' }
        }
      };
      mockedAxios.post.mockRejectedValueOnce(errorResponse);

      // Verify error is thrown
      await expect(
        signUp('existing@example.com', 'password', 'Test', 'User', 'testuser')
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('updateUsername', () => {
    it('calls API with correct parameters and returns token', async () => {
      // Setup localStorage token
      localStorage.setItem('token', 'old-token');

      // Mock successful response
      const mockResponse = {
        data: {
          message: 'Username updated successfully',
          token: 'new-token'
        }
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      // Call updateUsername function
      const result = await updateUsername('oldname', 'newname', 'password123');

      // Verify axios was called correctly
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:5000/user/update-username',
        {
          oldUsername: 'oldname',
          newUsername: 'newname',
          password: 'password123'
        },
        { headers: { Authorization: 'Bearer old-token' } }
      );

      // Verify correct result is returned
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('updatePassword', () => {
    it('calls API with correct parameters', async () => {
      // Setup localStorage token
      localStorage.setItem('token', 'test-token');

      // Mock successful response
      const mockResponse = {
        data: {
          message: 'Password updated successfully'
        }
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      // Call updatePassword function
      const result = await updatePassword('oldpass', 'newpass');

      // Verify axios was called correctly
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:5000/user/update-password',
        {
          oldPassword: 'oldpass',
          newPassword: 'newpass'
        },
        { headers: { Authorization: 'Bearer test-token' } }
      );

      // Verify correct result is returned
      expect(result).toEqual(mockResponse.data);
    });
  });
});

import axios from 'axios';
import { updateUsername as authUpdateUsername } from './authService';

const API_URL = 'http://localhost:5000/user';

/**
 * Get the current user's profile information
 * @returns Promise that resolves to the user data
 */
export const getUserProfile = async (): Promise<any> => {
  const token = localStorage.getItem('token');

  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const response = await axios.get(`${API_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Return just the user object from the response
    return response.data.user;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || 'Failed to get user profile';
    throw new Error(errorMessage);
  }
};

/**
 * Update the user's username - delegates to authService for API call
 * but handles the context updates
 *
 * @param oldUsername The current username
 * @param newUsername The new username to set
 * @param password The current password for verification
 * @returns Promise that resolves to the updated user data
 */
export const updateUsername = async (
  oldUsername: string,
  newUsername: string,
  password: string
): Promise<any> => {
  // Use the existing auth service function
  return authUpdateUsername(oldUsername, newUsername, password);
};

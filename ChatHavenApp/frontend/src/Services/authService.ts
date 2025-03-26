import axios from 'axios';

const API_URL = 'http://localhost:5000/user';

export const login = async (username: string, password: string) => {
  try {
    const response = await axios.post(`${API_URL}/login`, { username, password });
    return response.data;
  } catch (error) {
    throw new Error((error as any).response?.data?.error || 'Login failed. Please try again.');
  }
};

export const signUp = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  username: string
) => {
  try {
    const response = await axios.post(`${API_URL}/signup`, {
      email,
      password,
      firstName,
      lastName,
      username
    });
    return response.data;
  } catch (error) {
    throw new Error((error as any).response?.data?.error || 'Signup failed. Please try again.');
  }
};

export const updateUsername = async (
  oldUsername: string,
  newUsername: string,
  password: string
) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/update-username`,
      { oldUsername, newUsername, password },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      (error as any).response?.data?.error || 'Username update failed. Please try again.'
    );
  }
};

export const updatePassword = async (oldPassword: string, newPassword: string) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_URL}/update-password`,
      { oldPassword, newPassword },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      (error as any).response?.data?.error || 'Password update failed. Please try again.'
    );
  }
};

import axios from 'axios';

const API_URL = 'http://localhost:5000/user'; 

//User Login 
export const login = async (userID: string, password: string) => {
    try {
        const response = await axios.post(`${API_URL}/login`, { userID, password });
        return response.data; // Returns { message: 'User logged in successfully' }
    } catch (error) {
        // Extract error message from backend response
        throw new Error((error as any).response?.data?.error || 'Login failed. Please try again.');
    }
};

//User Signup 
export const signUp = async (email: string, password: string, firstName: string, lastName: string, userID: string) => {
    try {
        const response = await axios.post(`${API_URL}/signup`, { email, password, firstName, lastName, userID });
        return response.data; // Returns { message: 'User registered successfully' }
    } catch (error) {
        // Extract error message from backend response
        throw new Error((error as any).response?.data?.error || 'Signup failed. Please try again.');
    }
};

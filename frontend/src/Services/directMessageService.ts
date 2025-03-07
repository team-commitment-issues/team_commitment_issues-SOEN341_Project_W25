import axios from 'axios';

const API_URL = 'http://localhost:5000/directMessage';

export const createDirectMessage = async (username: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/createDirectMessage`, 
            { username },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Direct message creation failed. Please try again.');
    }
}

export const getDirectMessages = async (teamName: string, teamMember: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/getDirectMessages`, 
            { teamName, teamMember },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Failed to get direct messages. Please try again.');
    }
}
import axios from 'axios';

const API_URL = 'http://localhost:5000/superadmin'; 

export const createTeam = async (teamName: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/createTeam`, 
            { teamName },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Team creation failed. Please try again.');
    }
}
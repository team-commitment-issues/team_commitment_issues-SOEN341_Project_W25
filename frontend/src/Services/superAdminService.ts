import axios from 'axios';

const API_URL = 'http://localhost:5000/superadmin'; 

export const createTeam = async (teamName: string, teamMembers: string[]) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/createTeam`, 
            { teamName, teamMembers },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Team creation failed. Please try again.');
    }
}

export const addUserToTeam = async (userID: string, teamID: string, role: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/addUserToTeam`, 
            { userID, teamID, role },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Failed to add user to team. Please try again.');
    }
}

export const getUsers = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/getUsers`, { headers:
            { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Failed to fetch users. Please try again.');
    }
}
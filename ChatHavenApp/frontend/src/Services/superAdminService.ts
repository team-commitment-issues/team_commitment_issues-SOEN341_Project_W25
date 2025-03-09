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

export const addUserToTeam = async (username: string, teamName: string, role: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/addUserToTeam`, 
            { username, teamName, role },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Failed to add user to team. Please try again.');
    }
}

export const removeUserFromTeam = async (username: string, teamName: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/removeUserFromTeam`, 
            { username, teamName },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Failed to remove user from team. Please try again.');
    }
}

export const promoteToAdmin = async (username: string, teamName: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/promoteToAdmin`, 
            { username, teamName },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Failed to promote user. Please try again.');
    }
}

export const demoteToUser = async (username: string, teamName: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/demoteToUser`, 
            { username, teamName },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    }
    catch (error) {
        throw new Error((error as any).response?.data?.error || 'Failed to demote user. Please try again.');
    }
}

export const deleteTeam = async (teamName: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/deleteTeam`, 
            { teamName },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Failed to delete team. Please try again.');
    }
}
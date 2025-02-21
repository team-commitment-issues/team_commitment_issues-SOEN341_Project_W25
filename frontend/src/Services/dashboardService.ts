import axios from 'axios';

const API_URL = 'http://localhost:5000/dashboard';

export const getTeams = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/listTeams`, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Failed to fetch dashboard data. Please try again.');
    }
}

export const getUsers = async () => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/listUsers`, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Failed to fetch dashboard data. Please try again.');
    }
}

export const getChannels = async (teamId: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/listChannels/`, {
            params: { teamId },
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Failed to fetch dashboard data. Please try again.');
    }
}

export const getUsersInTeam = async (teamName: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/listUsersInTeam/`, {
            params: { teamName },
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Failed to fetch dashboard data. Please try again.');
    }
}

export const getUsersInChannel = async (teamName: string, channelName: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/listUsersInChannel/`, {
            params: { teamName, channelName },
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Failed to fetch dashboard data. Please try again.');
    }
}
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

export const getChannels = async (teamName: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/listChannels/`, {
            teamName: teamName
        }, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Failed to fetch dashboard data. Please try again.');
    }
}

export const getUsersInTeam = async (teamName: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/listUsersInTeam/`, {
            teamName: teamName
        }, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Failed to fetch dashboard data. Please try again.');
    }
}

export const getUsersInChannel = async (teamName: string, channelName: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/listUsersInChannel/`, {
            teamName: teamName,
            channelName: channelName
        }, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Failed to fetch dashboard data. Please try again.');
    }
}
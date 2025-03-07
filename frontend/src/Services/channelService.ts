import axios from 'axios';

const API_URL = 'http://localhost:5000/channel'; 

export const createChannel = async (channelName: string, teamName: string, selectedTeamMembers: string[]) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/createChannel`, 
            { channelName, teamName, selectedTeamMembers },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Channel creation failed. Please try again.');
    }
}

export const addUserToChannel = async (username: string, teamName: string, channelName: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/addUserToChannel`, 
            { username, teamName, channelName },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Failed to add user to channel. Please try again.');
    }
}

export const removeUserFromChannel = async (username: string, teamName: string, channelName: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/removeUserFromChannel`, 
            { username, teamName, channelName },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Failed to remove user from channel. Please try again.');
    }
}

export const sendMessage = async (teamName: string, channelName: string, text: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/sendMessage`, 
            { teamName, channelName, text },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Failed to send message. Please try again.');
    }
}

export const deleteChannel = async (teamName: string, channelName: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/deleteChannel`, 
            { teamName, channelName },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Failed to delete channel. Please try again.');
    }
}

export const getMessages = async (teamName: string, channelName: string) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/getMessages`, 
            { teamName, channelName },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        throw new Error((error as any).response?.data?.error || 'Failed to fetch messages. Please try again.');
    }
}
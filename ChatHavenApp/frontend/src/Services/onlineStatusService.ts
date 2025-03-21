import axios from 'axios';
import { Status } from '../types/shared';

const API_URL = 'http://localhost:5000/onlineStatus';

export const getUserOnlineStatus = async (usernames: string[]) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
            `${API_URL}/online-status`,
            { usernames },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching online status:', error);
        throw new Error((error as any).response?.data?.error || 'Failed to fetch online status');
    }
};

export const subscribeToOnlineStatus = (ws: WebSocket, teamName: string, channelName?: string) => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'subscribeOnlineStatus',
            teamName,
            channelName
        }));
        return true;
    }
    return false;
};

export const setUserStatus = async (status: Status) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
            `${API_URL}/set-status`,
            { status },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        console.error('Error setting user status:', error);
        throw new Error((error as any).response?.data?.error || 'Failed to update status');
    }
};
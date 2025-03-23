import { Status } from '../types/shared';

/**
 * Subscribe to online status for a team
 * This is the primary way to get status updates for users in a team
 */
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

/**
 * Send a status update through WebSocket
 */
export const sendUserStatus = (ws: WebSocket, status: Status) => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'setStatus',
            status
        }));
        return true;
    }
    return false;
};
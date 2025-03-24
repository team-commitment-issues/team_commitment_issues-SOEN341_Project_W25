/**
 * Creates a join request payload for establishing a direct message channel
 */
export const createDirectMessageRequest = (teamName: string, receiverUsername: string): any => {
    return {
        type: 'joinDirectMessage', 
        teamName,
        username: receiverUsername
    };
};

/**
 * Sends a direct message through WebSocket
 */
export const createDirectMessagePayload = (
    text: string, 
    senderUsername: string,
    teamName: string, 
    receiverUsername: string
): any => {
    return {
        type: 'directMessage',
        text,
        teamName,
        receiverUsername
    };
};

/**
 * Creates a request to fetch direct message history
 */
export const getDirectMessagesRequest = (
    teamName: string, 
    receiverUsername: string,
    before?: string,
    limit: number = 50
): any => {
    return {
        type: 'fetchHistory',
        teamName,
        username: receiverUsername,
        before,
        limit
    };
};
// directMessageService.ts - Update to match the new types

/**
 * Creates a join request payload for establishing a direct message channel
 */
export const createDirectMessageRequest = (teamName: string, receiverUsername: string): any => {
    return {
        type: 'joinDirectMessage', 
        teamName,
        username: receiverUsername  // This field name is kept for server compatibility
    };
};

/**
 * Sends a direct message through WebSocket
 */
export const createDirectMessagePayload = (
    text: string, 
    senderUsername: string,   // This is your username
    teamName: string, 
    receiverUsername: string  // This is who you're messaging
): any => {
    return {
        type: 'directMessage',
        text,
        teamName,
        receiverUsername      // Changed from "username" to "receiverUsername" for clarity
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
        username: receiverUsername,  // This field name is kept for server compatibility
        before,
        limit
    };
};
/**
 * WebSocket server configuration constants
 */
export const CONFIG = {
    // Debug mode - automatically disabled in production
    DEBUG: process.env.NODE_ENV !== 'production',

    // Reconnection timeout in milliseconds
    RECONNECT_TIMEOUT_MS: 5000,

    // Interval for cleaning up stale users (24 hours)
    STALE_USER_CLEANUP_INTERVAL_MS: 24 * 60 * 60 * 1000,

    // JWT secret for token verification
    JWT_SECRET: process.env.JWT_SECRET || '',

    // Maximum number of concurrent connections per user
    MAX_CONCURRENT_CONNECTIONS_PER_USER: 5,

    // Maximum WebSocket payload size (10MB)
    MAX_PAYLOAD_SIZE: 10 * 1024 * 1024,

    // Maximum number of messages to fetch in history
    MAX_HISTORY_LIMIT: 100,

    // Default history fetch limit
    DEFAULT_HISTORY_LIMIT: 50
};

/**
 * Error messages used throughout the WebSocket server
 */
export const ERROR_MESSAGES = {
    INVALID_TOKEN: 'Invalid token',
    TOKEN_EXPIRED: 'Token expired',
    AUTHENTICATION_FAILED: 'Authentication failed',
    TEAM_NOT_FOUND: (teamName: string) => `Team "${teamName}" not found`,
    USER_NOT_TEAM_MEMBER: (teamName: string) => `User not a member of team "${teamName}"`,
    CHANNEL_NOT_FOUND: (channelName: string, teamName: string) =>
        `Channel "${channelName}" not found in team "${teamName}"`,
    UNAUTHORIZED_CHANNEL: 'Unauthorized channel access',
    USER_NOT_FOUND: (id: string) => `User with ID "${id}" not found`,
    USERNAME_NOT_FOUND: (username: string) => `User with username "${username}" not found`,
    SELF_MESSAGING: 'Cannot create a direct message with yourself',
    NO_CHANNEL_SELECTED: 'No channel selected',
    MESSAGE_TEXT_REQUIRED: 'Message text is required',
    UNKNOWN_MESSAGE_TYPE: (type: string) => `Unknown message type: ${type}`,
    FILE_PROCESSING_FAILED: (error: string) => `Failed to process file attachment: ${error}`,
    RATE_LIMIT_EXCEEDED: 'Message rate limit exceeded. Please slow down.',
    TOO_MANY_CONNECTIONS: 'Too many concurrent connections',
    NO_TOKEN: 'No token provided',
    INVALID_STATUS: 'Invalid status',
    EDIT_LOCK_DENIED: (username: string) =>
        `You do not have the edit lock. The file is being edited by ${username}.`,
    NO_EDIT_LOCK: 'No active edit lock found for this file.',
    UPDATE_FAILED: 'Failed to update file content'
};
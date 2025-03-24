import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import WebSocketClient from '../Services/webSocketClient';
import { createStatusUpdatePayload, createOnlineStatusSubscriptionRequest, Status, UserStatus } from '../types/shared';
import { useUser } from './UserContext';

interface OnlineStatusContextType {
    onlineUsers: Record<string, UserStatus>;
    getUserStatus: (username: string) => UserStatus | undefined;
    updateUserStatus: (username: string, status: Status, lastSeen?: Date) => void;
    refreshStatuses: (usernames: string[]) => Promise<void>;
    subscribeToTeamStatuses: (teamName: string) => void;
    subscribeToChannelStatuses: (teamName: string, channelName: string) => void;
    setUserStatus: (status: Status) => void;
    currentUserStatus: Status;
}

const OnlineStatusContext = createContext<OnlineStatusContextType | undefined>(undefined);

export const useOnlineStatus = () => {
    const context = useContext(OnlineStatusContext);
    if (!context) {
        throw new Error('useOnlineStatus must be used within an OnlineStatusProvider');
    }
    return context;
};

interface OnlineStatusProviderProps {
    children: ReactNode;
}

export const OnlineStatusProvider: React.FC<OnlineStatusProviderProps> = ({ children }) => {
    const [onlineUsers, setOnlineUsers] = useState<Record<string, UserStatus>>({});
    const [isConnected, setIsConnected] = useState(false);
    const [currentUserStatus, setCurrentUserStatus] = useState<Status>(Status.ONLINE);
    // Get current username from UserContext instead of localStorage
    const { userData } = useUser();
    const currentUsername = userData?.username || null;

    // Use the shared WebSocket service
    const wsService = WebSocketClient.getInstance();

    const getUserStatus = useCallback((username: string): UserStatus | undefined => {
        return onlineUsers[username];
    }, [onlineUsers]);

    const updateUserStatus = useCallback((username: string, status: Status, lastSeen?: Date) => {
        setOnlineUsers(prev => ({
            ...prev,
            [username]: { username, status, lastSeen: lastSeen || new Date() }
        }));

        // Update current user status if it's our own status
        if (username === currentUsername) {
            setCurrentUserStatus(status);
        }
    }, [currentUsername]);

    const refreshStatuses = useCallback(async (usernames: string[]): Promise<void> => {
        if (!usernames.length || !isConnected) {
            return Promise.resolve();
        }

        try {
            // For each username, add a default offline status if they don't exist yet
            const updatedUsers = { ...onlineUsers };

            usernames.forEach(username => {
                if (!updatedUsers[username]) {
                    updatedUsers[username] = {
                        username,
                        status: Status.OFFLINE,
                        lastSeen: new Date()
                    };
                }
            });

            setOnlineUsers(updatedUsers);

            return Promise.resolve();
        } catch (error) {
            console.error("Failed to refresh statuses:", error);
            return Promise.reject(error);
        }
    }, [isConnected, onlineUsers]);

    // Set user status through shared WebSocket
    const setUserStatus = useCallback((status: Status) => {
        if (!isConnected) return;

        try {
            // Create a status update payload using the helper
            const statusPayload = createStatusUpdatePayload(status);
            wsService.send(statusPayload);

            // Optimistically update local state
            if (currentUsername) {
                updateUserStatus(currentUsername, status);
                setCurrentUserStatus(status);
            }

            console.log(`Status update sent: ${status}`);
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    }, [isConnected, wsService, currentUsername, updateUserStatus]);

    // Connect to WebSocket once on component mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        if (!currentUsername) {
            console.warn('Username not available. Status features may not work correctly.');
        } else {
            console.log(`Current username from context: ${currentUsername}`);
        }

        const handleConnection = () => {
            console.log("Status context connected to WebSocket");
            setIsConnected(true);
        };

        const handleDisconnection = () => {
            console.log("Status context disconnected from WebSocket");
            setIsConnected(false);
        };

        const handleStatusUpdate = (data: any) => {
            if (data.type === "statusUpdate") {
                updateUserStatus(
                    data.username,
                    data.status,
                    data.lastSeen ? new Date(data.lastSeen) : new Date()
                );

                console.log(`Status update received for ${data.username}: ${data.status}`);
            }
        };

        // Subscribe to status updates
        wsService.addConnectionListener(handleConnection);
        wsService.addDisconnectionListener(handleDisconnection);
        const subscriptionId = wsService.subscribe("statusUpdate", handleStatusUpdate);

        // Also subscribe to error messages
        const errorSubId = wsService.subscribe("error", (data) => {
            console.error("WebSocket error:", data.message);
        });

        // Connect to the WebSocket if not already connected
        if (!wsService.isConnected()) {
            wsService.connect(token).catch((error: any) => {
                console.error("Failed to connect to WebSocket:", error);
            });
        } else {
            // If already connected, set the flag
            setIsConnected(true);
        }

        return () => {
            wsService.removeConnectionListener(handleConnection);
            wsService.removeDisconnectionListener(handleDisconnection);
            wsService.unsubscribe(subscriptionId);
            wsService.unsubscribe(errorSubId);
        };
    }, [currentUsername, updateUserStatus, wsService]);

    // Initialize current user's status when connection is established
    useEffect(() => {
        if (isConnected && currentUsername) {
            if (!onlineUsers[currentUsername]) {
                // Using a direct WebSocket send instead of setUserStatus to avoid the loop
                const statusPayload = createStatusUpdatePayload(Status.ONLINE);
                wsService.send(statusPayload);

                // Update local state directly
                updateUserStatus(currentUsername, Status.ONLINE);
            } else {
                setCurrentUserStatus(onlineUsers[currentUsername].status);
            }
        }
    }, [isConnected, currentUsername, onlineUsers, wsService, updateUserStatus]);

    // Subscribe to team statuses
    const subscribeToTeamStatuses = useCallback((teamName: string) => {
        if (!isConnected || !teamName) return;

        try {
            const payload = createOnlineStatusSubscriptionRequest(teamName);
            wsService.send(payload);
            console.log(`Subscribed to online status for team: ${teamName}`);
        } catch (error) {
            console.error(`Failed to subscribe to team statuses for ${teamName}:`, error);
        }
    }, [isConnected, wsService]);

    // Subscribe to channel statuses
    const subscribeToChannelStatuses = useCallback((teamName: string, channelName: string) => {
        if (!isConnected || !teamName || !channelName) return;

        try {
            const payload = createOnlineStatusSubscriptionRequest(teamName, channelName);
            wsService.send(payload);
            console.log(`Subscribed to online status for channel: ${teamName}/${channelName}`);
        } catch (error) {
            console.error(`Failed to subscribe to channel statuses for ${teamName}/${channelName}:`, error);
        }
    }, [isConnected, wsService]);

    const contextValue = React.useMemo(() => ({
        onlineUsers,
        getUserStatus,
        updateUserStatus,
        refreshStatuses,
        subscribeToTeamStatuses,
        subscribeToChannelStatuses,
        setUserStatus,
        currentUserStatus
    }), [
        onlineUsers,
        getUserStatus,
        updateUserStatus,
        refreshStatuses,
        subscribeToTeamStatuses,
        subscribeToChannelStatuses,
        setUserStatus,
        currentUserStatus
    ]);

    return (
        <OnlineStatusContext.Provider value={contextValue}>
            {children}
        </OnlineStatusContext.Provider>
    );
};
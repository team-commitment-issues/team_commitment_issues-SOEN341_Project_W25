import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import WebSocketClient from '../Services/webSocketClient';
import { Status, UserStatus, MessageStatus } from '../types/shared';

interface OnlineStatusContextType {
    onlineUsers: Record<string, UserStatus>;
    getUserStatus: (username: string) => UserStatus | undefined;
    updateUserStatus: (username: string, status: Status, lastSeen?: Date) => void;
    refreshStatuses: (usernames: string[]) => void;
    subscribeToTeamStatuses: (teamName: string) => void;
    subscribeToChannelStatuses: (teamName: string, channelName: string) => void;
    setUserStatus: (status: Status) => void;
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
    
    // Use the shared WebSocket service
    const wsService = WebSocketClient.getInstance();
    
    const getUserStatus = useCallback((username: string): UserStatus | undefined => {
        return onlineUsers[username];
    }, [onlineUsers]);

    const updateUserStatus = useCallback((username: string, status: Status, lastSeen?: Date) => {
        setOnlineUsers(prev => ({
            ...prev,
            [username]: { username, status, lastSeen }
        }));
    }, []);

    // Updated to use the shared WebSocket service
    const refreshStatuses = useCallback((usernames: string[]) => {
        if (!usernames.length || !isConnected) return;
        
        // We rely on subscriptions to get status updates
    }, [isConnected]);

    // Set user status through shared WebSocket
    const setUserStatus = useCallback((status: Status) => {
        if (!isConnected) return;
        
        // Use the shared WebSocket service to send the status update
        wsService.send({
            type: 'setStatus',
            status: status as MessageStatus
        });
    }, [isConnected, wsService]);

    // Connect to WebSocket once on component mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

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
                    data.lastSeen ? new Date(data.lastSeen) : undefined
                );
            }
        };

        // Subscribe to status updates
        wsService.addConnectionListener(handleConnection);
        wsService.addDisconnectionListener(handleDisconnection);
        const subscriptionId = wsService.subscribe("statusUpdate", handleStatusUpdate);
        
        // Connect to the WebSocket
        wsService.connect(token).catch((error: any) => {
            console.error("Failed to connect to WebSocket:", error);
        });
        
        return () => {
            wsService.removeConnectionListener(handleConnection);
            wsService.removeDisconnectionListener(handleDisconnection);
            wsService.unsubscribe(subscriptionId);
        };
    }, [updateUserStatus, wsService]);
    
    const subscribeToTeamStatuses = useCallback((teamName: string) => {
        if (isConnected) {
            // Use the shared WebSocket service
            wsService.send({
                type: 'subscribeOnlineStatus',
                teamName
            });
        }
    }, [isConnected, wsService]);

    const subscribeToChannelStatuses = useCallback((teamName: string, channelName: string) => {
        if (isConnected) {
            // Use the shared WebSocket service
            wsService.send({
                type: 'subscribeOnlineStatus',
                teamName,
                channelName
            });
        }
    }, [isConnected, wsService]);

    const contextValue = React.useMemo(() => ({
        onlineUsers,
        getUserStatus,
        updateUserStatus,
        refreshStatuses,
        subscribeToTeamStatuses,
        subscribeToChannelStatuses,
        setUserStatus
    }), [
        onlineUsers,
        getUserStatus,
        updateUserStatus,
        refreshStatuses,
        subscribeToTeamStatuses,
        subscribeToChannelStatuses,
        setUserStatus
    ]);

    return (
        <OnlineStatusContext.Provider value={contextValue}>
            {children}
        </OnlineStatusContext.Provider>
    );
};
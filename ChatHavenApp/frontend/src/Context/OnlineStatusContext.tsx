import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { getUserOnlineStatus, subscribeToOnlineStatus } from '../Services/onlineStatusService';

type Status = 'online' | 'away' | 'busy' | 'offline';

interface UserStatus {
    username: string;
    status: Status;
    lastSeen?: Date;
}

interface OnlineStatusContextType {
    onlineUsers: Record<string, UserStatus>;
    getUserStatus: (username: string) => UserStatus | undefined;
    updateUserStatus: (username: string, status: Status, lastSeen?: Date) => void;
    refreshStatuses: (usernames: string[]) => Promise<void>;
    subscribeToTeamStatuses: (teamName: string) => void;
    subscribeToChannelStatuses: (teamName: string, channelName: string) => void;
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
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    
    const getUserStatus = useCallback((username: string): UserStatus | undefined => {
        return onlineUsers[username];
    }, [onlineUsers]);

    const updateUserStatus = useCallback((username: string, status: Status, lastSeen?: Date) => {
        setOnlineUsers(prev => ({
            ...prev,
            [username]: { username, status, lastSeen }
        }));
    }, []);

    const refreshStatuses = useCallback(async (usernames: string[]) => {
        if (!usernames.length) return;
        
        try {
            const response = await getUserOnlineStatus(usernames);
            const newStatuses: Record<string, UserStatus> = {};
            
            response.statuses.forEach((status: UserStatus) => {
                newStatuses[status.username] = {
                    ...status,
                    lastSeen: status.lastSeen ? new Date(status.lastSeen) : undefined
                };
            });
            
            setOnlineUsers(prev => ({ ...prev, ...newStatuses }));
        } catch (error) {
            console.error('Failed to refresh online statuses:', error);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const connectWebSocket = () => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                setIsConnected(true);
                return;
            }

            wsRef.current = new WebSocket(`ws://localhost:5000?token=${token}`);
            
            wsRef.current.onopen = () => {
                console.log("Status WebSocket connection established");
                setIsConnected(true);
            };
            
            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === "statusUpdate") {
                        updateUserStatus(
                            data.username, 
                            data.status, 
                            data.lastSeen ? new Date(data.lastSeen) : undefined
                        );
                    }
                } catch (error) {
                    console.error("Failed to parse status message:", error);
                }
            };
            
            wsRef.current.onclose = () => {
                console.log("Status WebSocket connection closed");
                setIsConnected(false);
                setTimeout(connectWebSocket, 5000);
            };
            
            wsRef.current.onerror = (error) => {
                console.error("Status WebSocket error:", error);
            };
        };
        
        connectWebSocket();
        
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [updateUserStatus]);
    
    const subscribeToTeamStatuses = useCallback((teamName: string) => {
        if (wsRef.current && isConnected) {
            subscribeToOnlineStatus(wsRef.current, teamName);
        }
    }, [isConnected]);

    const subscribeToChannelStatuses = useCallback((teamName: string, channelName: string) => {
        if (wsRef.current && isConnected) {
            subscribeToOnlineStatus(wsRef.current, teamName, channelName);
        }
    }, [isConnected]);

    const contextValue = React.useMemo(() => ({
        onlineUsers,
        getUserStatus,
        updateUserStatus,
        refreshStatuses,
        subscribeToTeamStatuses,
        subscribeToChannelStatuses
    }), [
        onlineUsers,
        getUserStatus,
        updateUserStatus,
        refreshStatuses,
        subscribeToTeamStatuses,
        subscribeToChannelStatuses
    ]);

    return (
        <OnlineStatusContext.Provider value={contextValue}>
            {children}
        </OnlineStatusContext.Provider>
    );
};
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { getUserOnlineStatus, subscribeToOnlineStatus } from '../Services/onlineStatusService';

type StatusType = 'online' | 'away' | 'busy' | 'offline';

interface UserStatus {
    username: string;
    status: StatusType;
    lastSeen?: Date;
}

interface OnlineStatusContextType {
    onlineUsers: Record<string, UserStatus>;
    getUserStatus: (username: string) => UserStatus | undefined;
    updateUserStatus: (username: string, status: StatusType, lastSeen?: Date) => void;
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

    const getUserStatus = (username: string): UserStatus | undefined => {
        return onlineUsers[username];
    };

    const updateUserStatus = (username: string, status: StatusType, lastSeen?: Date) => {
        setOnlineUsers(prev => ({
            ...prev,
            [username]: { username, status, lastSeen }
        }));
    };

    const refreshStatuses = async (usernames: string[]) => {
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
    };

    // Setup WebSocket connection
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Create WebSocket connection (reuse existing socket from messaging if possible)
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
                setTimeout(connectWebSocket, 5000); // Reconnect after 5 seconds
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
    }, []);
    
    // Subscribe to status updates for a team when connected
    const subscribeToTeamStatuses = (teamName: string) => {
        if (wsRef.current && isConnected) {
            subscribeToOnlineStatus(wsRef.current, teamName);
        }
    };

    // Subscribe to status updates for a channel when connected
    const subscribeToChannelStatuses = (teamName: string, channelName: string) => {
        if (wsRef.current && isConnected) {
            subscribeToOnlineStatus(wsRef.current, teamName, channelName);
        }
    };

    return (
        <OnlineStatusContext.Provider value={{
            onlineUsers,
            getUserStatus,
            updateUserStatus,
            refreshStatuses,
            subscribeToTeamStatuses,
            subscribeToChannelStatuses // Added to context
        }}>
            {children}
        </OnlineStatusContext.Provider>
    );
};
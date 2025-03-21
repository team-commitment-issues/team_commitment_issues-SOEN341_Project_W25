import React from 'react';
import { useOnlineStatus } from '../../Context/OnlineStatusContext';

interface UserStatusIndicatorProps {
    username: string;
    showStatusText?: boolean;
    size?: 'small' | 'medium' | 'large';
}

const UserStatusIndicator: React.FC<UserStatusIndicatorProps> = ({ 
    username, 
    showStatusText = false,
    size = 'medium'
}) => {
    const { getUserStatus } = useOnlineStatus();
    const userStatus = getUserStatus(username);
    
    const status = userStatus?.status || 'offline';
    
    const sizeInPx = size === 'small' ? 8 : size === 'medium' ? 12 : 16;
    
    const getStatusColor = () => {
        switch (status) {
            case 'online': return '#4CAF50'; // Green
            case 'away': return '#FFC107';   // Yellow
            case 'busy': return '#F44336';   // Red
            case 'offline': return '#9E9E9E'; // Gray
            default: return '#9E9E9E';
        }
    };
    
    // Format last seen time if available
    const getLastSeenText = () => {
        if (!userStatus?.lastSeen) return '';
        
        const lastSeen = userStatus.lastSeen;
        const now = new Date();
        const diffMs = now.getTime() - lastSeen.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        
        return lastSeen.toLocaleDateString();
    };
    
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
                width: `${sizeInPx}px`,
                height: `${sizeInPx}px`,
                borderRadius: '50%',
                backgroundColor: getStatusColor(),
                display: 'inline-block'
            }} />
            
            {showStatusText && (
                <div style={{ fontSize: `${sizeInPx * 0.9}px` }}>
                    <span>{status}</span>
                    {status === 'offline' && userStatus?.lastSeen && (
                        <span style={{ marginLeft: '4px', opacity: 0.7 }}>
                            ({getLastSeenText()})
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserStatusIndicator;
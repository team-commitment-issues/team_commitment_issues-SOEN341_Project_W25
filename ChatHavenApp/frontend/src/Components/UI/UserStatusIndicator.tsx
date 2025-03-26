import React from 'react';
import { useOnlineStatus } from '../../Context/OnlineStatusContext.tsx';
import { Status } from '../../types/shared.ts';

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

  const status = userStatus?.status || Status.OFFLINE;

  const sizeInPx = size === 'small' ? 8 : size === 'medium' ? 12 : 16;
  const textSize = size === 'small' ? 10 : size === 'medium' ? 12 : 14;

  const getStatusColor = () => {
    switch (status) {
      case Status.ONLINE:
        return '#4CAF50'; // Green
      case Status.AWAY:
        return '#FFC107'; // Yellow
      case Status.BUSY:
        return '#F44336'; // Red
      case Status.OFFLINE:
        return '#9E9E9E'; // Gray
      default:
        return '#9E9E9E';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case Status.ONLINE:
        return 'Online';
      case Status.AWAY:
        return 'Away';
      case Status.BUSY:
        return 'Busy';
      case Status.OFFLINE:
        return 'Offline';
      default:
        return 'Offline';
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

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return lastSeen.toLocaleDateString();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div
        style={{
          width: `${sizeInPx}px`,
          height: `${sizeInPx}px`,
          borderRadius: '50%',
          backgroundColor: getStatusColor(),
          display: 'inline-block',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
        }}
      />

      {showStatusText && (
        <div style={{ fontSize: `${textSize}px` }}>
          <span>{getStatusText()}</span>
          {status === Status.OFFLINE && userStatus?.lastSeen && (
            <span style={{ marginLeft: '4px', opacity: 0.7 }}>({getLastSeenText()})</span>
          )}
        </div>
      )}
    </div>
  );
};

export default UserStatusIndicator;

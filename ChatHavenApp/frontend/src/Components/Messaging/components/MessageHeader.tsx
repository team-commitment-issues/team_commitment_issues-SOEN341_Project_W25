import React from 'react';
import { useTheme } from '../../../Context/ThemeContext.tsx';
import UserStatusIndicator from '../../UI/UserStatusIndicator.tsx';
import { Selection } from '../../../types/shared.ts';
import styles from '../../../Styles/dashboardStyles.ts';

interface MessageHeaderProps {
    selection: Selection | null;
    connectionStatus: 'connected' | 'connecting' | 'disconnected';
}

const MessageHeader: React.FC<MessageHeaderProps> = ({ selection, connectionStatus }) => {
    const { theme } = useTheme();

    const getStyledComponent = (baseStyle: any) => ({
        ...baseStyle,
        ...(theme === 'dark' && baseStyle['&.dark-mode'])
    });

    const getSelectionTitle = () => {
        if (!selection) return 'No selection';

        if (selection.type === 'channel') {
            return `Channel: ${selection.channelName}`;
        } else {
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Direct Messages with {selection.username || 'Unknown User'}</span>
                    <UserStatusIndicator
                        username={selection.username || 'Unknown User'}
                        showStatusText={true}
                        size="medium"
                    />
                </div>
            );
        }
    };

    const getConnectionStatusIndicator = () => {
        const statusMap = {
            connected: { icon: '🟢', text: 'Connected' },
            connecting: { icon: '🟠', text: 'Connecting...' },
            disconnected: { icon: '🔴', text: 'Disconnected' }
        };

        const status = statusMap[connectionStatus];

        return (
            <div style={{ fontSize: '12px', marginLeft: '8px' }}>
                {status.icon} {status.text}
            </div>
        );
    };

    return (
        <div style={getStyledComponent(styles.chatHeader)}>
            {getSelectionTitle()}
            {getConnectionStatusIndicator()}
        </div>
    );
};

export default MessageHeader;
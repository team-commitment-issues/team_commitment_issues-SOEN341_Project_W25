import React from 'react';
import { MessageStatus } from '../../types/shared';

interface MessageStatusIndicatorProps {
  status?: MessageStatus;
  dark?: boolean;
}

const MessageStatusIndicator: React.FC<MessageStatusIndicatorProps> = ({
  status = 'pending',
  dark = false
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return '⏱️';
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return <span style={{ color: '#34B7F1' }}>✓✓</span>;
      case 'failed':
        return <span style={{ color: '#F15050' }}>⚠️</span>;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Sending...';
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'read':
        return 'Read';
      case 'failed':
        return 'Failed';
      default:
        return '';
    }
  };

  if (!status) return null;

  return (
    <span
      style={{
        fontSize: '11px',
        marginLeft: '4px',
        color: dark ? '#AAA' : '#777',
        display: 'inline-flex',
        alignItems: 'center'
      }}
      title={getStatusText()}
    >
      <span style={{ marginRight: '2px' }}>{getStatusIcon()}</span>
      {status === 'failed' && <span style={{ marginLeft: '2px' }}>{getStatusText()}</span>}
    </span>
  );
};

export default MessageStatusIndicator;

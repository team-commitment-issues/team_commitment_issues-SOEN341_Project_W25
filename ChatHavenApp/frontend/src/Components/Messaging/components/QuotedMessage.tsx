import React from 'react';
import { useTheme } from '../../../Context/ThemeContext.tsx';
import { QuotedMessage as QuotedMessageType } from '../../../types/shared.ts';

interface QuotedContentProps {
    quotedMessage: QuotedMessageType;
    preview?: boolean;
    onCancel?: () => void;
}

const QuotedMessage: React.FC<QuotedContentProps> = ({
    quotedMessage,
    preview = false,
    onCancel
}) => {
    const { theme } = useTheme();

    if (preview) {
        return (
            <div style={{
                padding: '8px 12px',
                marginBottom: '8px',
                borderLeft: '3px solid #4682B4',
                backgroundColor: theme === 'dark' ? '#383838' : '#f0f0f0',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                        Replying to {quotedMessage.username}
                    </div>
                    <div style={{
                        fontSize: '13px',
                        color: theme === 'dark' ? '#ccc' : '#555',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        maxWidth: '300px'
                    }}>
                        {quotedMessage.text}
                    </div>
                </div>
                {onCancel && (
                    <button
                        onClick={onCancel}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '16px',
                            color: theme === 'dark' ? '#ccc' : '#666'
                        }}
                        aria-label="Cancel reply"
                    >
                        ×
                    </button>
                )}
            </div>
        );
    }

    // Non-preview quoted message (inside a message bubble)
    return (
        <div style={{
            padding: '6px 10px',
            marginBottom: '6px',
            borderLeft: '2px solid #4682B4',
            backgroundColor: theme === 'dark' ? 'rgba(56, 56, 56, 0.5)' : 'rgba(240, 240, 240, 0.5)',
            borderRadius: '4px',
            fontSize: '13px'
        }}>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                {quotedMessage.username}
            </div>
            <div style={{ color: theme === 'dark' ? '#ccc' : '#555' }}>
                {quotedMessage.text}
            </div>
        </div>
    );
};

export default QuotedMessage;
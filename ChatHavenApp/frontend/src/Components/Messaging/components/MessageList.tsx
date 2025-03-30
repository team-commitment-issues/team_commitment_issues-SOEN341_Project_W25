import React, { useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../../../Context/ThemeContext.tsx';
import { useMessageContext } from '../context/MessageContext.ts';
import MessageItem from './MessageItem.tsx';
import styles from '../../../Styles/dashboardStyles.ts';
import { Selection } from '../../../types/shared.ts';

interface MessageListProps {
    selection: Selection | null;
    username: string;
    onContextMenu: (e: React.MouseEvent, messageId: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({
    selection,
    username,
    onContextMenu
}) => {
    const { theme } = useTheme();
    const {
        messages,
        isLoadingHistory,
        hasMoreMessages,
        initialLoadDone,
        typingIndicator,
        loadOlderMessages,
        resendMessage
    } = useMessageContext();

    const chatBoxRef = useRef<HTMLDivElement>(null);

    const getStyledComponent = (baseStyle: any) => ({
        ...baseStyle,
        ...(theme === 'dark' && baseStyle['&.dark-mode'])
    });

    // Handle scroll to detect when to load more messages
    const handleScroll = useCallback(() => {
        if (!chatBoxRef.current) return;

        // Check if user has scrolled near the top (threshold of 100px)
        const { scrollTop } = chatBoxRef.current;

        if (scrollTop < 100 && hasMoreMessages && !isLoadingHistory) {
            loadOlderMessages();
        }
    }, [hasMoreMessages, isLoadingHistory, loadOlderMessages]);

    // Register scroll handler
    useEffect(() => {
        const chatBoxElement = chatBoxRef.current;
        if (chatBoxElement) {
            chatBoxElement.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (chatBoxElement) {
                chatBoxElement.removeEventListener('scroll', handleScroll);
            }
        };
    }, [handleScroll]);

    // Scroll to bottom when new messages arrive (if already at bottom)
    useEffect(() => {
        if (chatBoxRef.current && messages.length > 0 && !isLoadingHistory) {
            const chatBox = chatBoxRef.current;
            const isScrolledToBottom =
                chatBox.scrollHeight - chatBox.clientHeight <= chatBox.scrollTop + 50;

            if (isScrolledToBottom || messages[messages.length - 1].username === username) {
                // Only auto-scroll if already at bottom or if it's our own message
                chatBox.scrollTop = chatBox.scrollHeight;
            }
        }
    }, [messages, isLoadingHistory, username]);

    return (
        <div
            style={getStyledComponent(styles.chatBox)}
            ref={chatBoxRef}
            role="log"
            aria-live="polite"
        >
            {/* Loading older messages indicator */}
            {isLoadingHistory && (
                <div
                    style={{
                        textAlign: 'center',
                        padding: '10px',
                        fontSize: '14px',
                        color: theme === 'dark' ? '#aaa' : '#666'
                    }}
                >
                    Loading messages...
                </div>
            )}

            {/* Load more messages button */}
            {hasMoreMessages && !isLoadingHistory && (
                <div
                    style={{
                        textAlign: 'center',
                        padding: '10px',
                        marginBottom: '5px'
                    }}
                >
                    <button
                        onClick={loadOlderMessages}
                        style={{
                            background: theme === 'dark' ? '#444' : '#eee',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '5px 10px',
                            cursor: 'pointer',
                            color: theme === 'dark' ? '#fff' : '#333',
                            fontSize: '13px'
                        }}
                    >
                        Load older messages
                    </button>
                </div>
            )}

            {/* No messages placeholder */}
            {messages.length === 0 && !isLoadingHistory && initialLoadDone ? (
                <p style={getStyledComponent(styles.chatPlaceholder)}>
                    {selection ? 'No messages yet. Say hello!' : 'Select a channel or user to chat with.'}
                </p>
            ) : (
                /* Message list */
                messages.map(message => (
                    <MessageItem
                        key={message._id || message.clientMessageId || `msg-${Math.random()}`}
                        message={message}
                        isCurrentUser={message.username === username}
                        onContextMenu={onContextMenu}
                        onResend={resendMessage}
                        selection={selection} // Pass selection to MessageItem
                    />
                ))
            )}

            {/* Typing indicator */}
            {typingIndicator?.isTyping && (
                <div
                    style={{
                        padding: '8px 12px',
                        margin: '4px 0',
                        fontSize: '14px',
                        color: theme === 'dark' ? '#ccc' : '#555',
                        fontStyle: 'italic'
                    }}
                    aria-live="polite"
                >
                    {typingIndicator.username} is typing...
                </div>
            )}
        </div>
    );
};

export default MessageList;
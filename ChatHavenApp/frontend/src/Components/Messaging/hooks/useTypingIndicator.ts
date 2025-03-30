import { useState, useRef, useCallback, useEffect } from 'react';
import WebSocketClient from '../../../Services/webSocketClient.ts';
import { Selection } from '../../../types/shared.ts';

/**
 * Custom hook for managing typing indicators
 */
export function useTypingIndicator(selection: Selection | null, username: string) {
    const [typingIndicator, setTypingIndicator] = useState<{
        username: string;
        isTyping: boolean;
    } | null>(null);
    const [isTyping, setIsTyping] = useState(false);

    // Refs
    const typingTimeout = useRef<NodeJS.Timeout | null>(null);

    // Services
    const wsService = WebSocketClient.getInstance();

    // Send typing status to server
    const sendTypingStatus = useCallback((isTyping: boolean) => {
        if (!wsService.isConnected() || !selection) return;

        const typingMessage =
            selection.type === 'channel'
                ? {
                    type: 'typing',
                    isTyping,
                    username,
                    teamName: selection.teamName,
                    channelName: selection.channelName
                }
                : {
                    type: 'typing',
                    isTyping,
                    username,
                    teamName: selection.teamName,
                    receiverUsername: selection.username
                };

        wsService.send(typingMessage);
    }, [selection, username, wsService]);

    // Handle input change for typing indicator
    const handleInputChange = useCallback((text: string) => {
        // Send typing indicator
        if (!isTyping) {
            setIsTyping(true);
            sendTypingStatus(true);
        }

        // Clear previous timeout
        if (typingTimeout.current) {
            clearTimeout(typingTimeout.current);
        }

        // Set new timeout
        typingTimeout.current = setTimeout(() => {
            setIsTyping(false);
            sendTypingStatus(false);
        }, 3000);
    }, [isTyping, sendTypingStatus]);

    // Clear typing status
    const clearTypingStatus = useCallback(() => {
        if (isTyping) {
            setIsTyping(false);
            sendTypingStatus(false);

            if (typingTimeout.current) {
                clearTimeout(typingTimeout.current);
                typingTimeout.current = null;
            }
        }
    }, [isTyping, sendTypingStatus]);

    // Process typing message from server
    const handleTypingMessage = useCallback((data: any) => {
        if (data.username !== username) {
            setTypingIndicator({
                username: data.username || '',
                isTyping: data.isTyping || false
            });

            // Clear typing indicator after 5 seconds if no update is received
            if (data.isTyping) {
                setTimeout(() => {
                    setTypingIndicator(current => (current?.username === data.username ? null : current));
                }, 5000);
            } else {
                setTypingIndicator(null);
            }
        }
    }, [username]);

    // Clean up on unmount or when selection changes
    useEffect(() => {
        // Reset typing indicator when changing conversations
        setTypingIndicator(null);
        if (isTyping) {
            setIsTyping(false);
            if (typingTimeout.current) {
                clearTimeout(typingTimeout.current);
                typingTimeout.current = null;
            }
        }

        return () => {
            if (typingTimeout.current) {
                clearTimeout(typingTimeout.current);
                typingTimeout.current = null;
            }
        };
    }, [isTyping, selection]);

    return {
        typingIndicator,
        isTyping,
        handleInputChange,
        clearTypingStatus,
        handleTypingMessage
    };
}
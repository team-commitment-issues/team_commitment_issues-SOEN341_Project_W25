import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { useMessages } from '../hooks/useMessages.ts';
import { useMessageConnection } from '../hooks/useMessageConnection.ts';
import { useTypingIndicator } from '../hooks/useTypingIndicator.ts';
import { ChatMessage, Selection, WebSocketMessage, QuotedMessage } from '../../../types/shared.ts';

// Define the shape of our context
export interface MessageContextType {
    // Message state
    messages: ChatMessage[];
    isLoadingHistory: boolean;
    hasMoreMessages: boolean;
    initialLoadDone: boolean;
    quotedMessage: QuotedMessage | null;

    // Connection state
    connectionStatus: 'connected' | 'connecting' | 'disconnected';

    // Typing state
    typingIndicator: { username: string; isTyping: boolean } | null;

    // Refs for scroll state
    lastScrollHeight: React.MutableRefObject<number>;
    scrollPositionRef: React.MutableRefObject<number>;

    // Actions
    sendTextMessage: (text: string) => void;
    resendMessage: (message: ChatMessage) => void;
    loadOlderMessages: () => void;
    deleteMessage: (messageId: string) => void;
    uploadFile: (files: FileList) => void;
    quoteMessage: (messageId: string) => void;
    clearQuotedMessage: () => void;
    handleTypingChange: (text: string) => void;
}

// Create and export the context with explicit type
export const MessageContext = createContext<MessageContextType | undefined>(undefined);

// Explicitly name and export the provider component
export interface MessageProviderProps {
    children: ReactNode;
    selection: Selection | null;
    username: string;
}

export const MessageProvider = (props: MessageProviderProps): React.ReactElement | null => {
    const { children, selection, username } = props;

    // Initialize hooks
    const messagesHook = useMessages(selection, username);
    const typingHook = useTypingIndicator(selection, username);

    // Handle websocket messages
    const handleWebSocketMessage = useCallback((data: any) => {
        if (!data || !data.type) {
            console.warn('Received invalid WebSocket message', data);
            return;
        }

        console.log('WebSocket message received:', data);

        switch (data.type) {
            case 'typing':
                typingHook.handleTypingMessage(data);
                break;
            case 'historyResponse':
                messagesHook.processHistoryResponse(data);
                break;
            case 'message':
            case 'directMessage':
                messagesHook.processIncomingMessage(data);
                break;
            case 'messageAck':
                messagesHook.processMessageAck(data);
                break;
            case 'fileUploadComplete':
                messagesHook.processFileUploadComplete(data);
                break;
            case 'fileUpdated':
                messagesHook.processFileUpdated(data);
                break;
        }
    }, [typingHook, messagesHook]);

    const connectionHook = useMessageConnection(selection, handleWebSocketMessage);

    // Higher-level action handlers
    const sendTextMessage = useCallback((text: string) => {
        if (!text.trim() || !selection) return;

        const newMessage: WebSocketMessage =
            selection.type === 'directMessage'
                ? {
                    type: 'directMessage',
                    text,
                    teamName: selection.teamName,
                    receiverUsername: selection.username,
                    ...(messagesHook.quotedMessage && { quotedMessage: messagesHook.quotedMessage })
                }
                : {
                    type: 'message',
                    text,
                    username,
                    teamName: selection.teamName,
                    channelName: selection.channelName,
                    ...(messagesHook.quotedMessage && { quotedMessage: messagesHook.quotedMessage })
                };

        messagesHook.sendMessage(newMessage);
        typingHook.clearTypingStatus();
        messagesHook.clearQuotedMessage();
    }, [messagesHook, selection, typingHook, username]);

    const contextValue = useMemo(() => ({
        // Message state
        messages: messagesHook.messages,
        isLoadingHistory: messagesHook.isLoadingHistory,
        hasMoreMessages: messagesHook.hasMoreMessages,
        initialLoadDone: messagesHook.initialLoadDone,
        quotedMessage: messagesHook.quotedMessage,

        // Connection state
        connectionStatus: connectionHook.connectionStatus,

        // Typing state
        typingIndicator: typingHook.typingIndicator,

        // Refs for scroll handling
        lastScrollHeight: messagesHook.lastScrollHeight,
        scrollPositionRef: messagesHook.scrollPositionRef,

        // Actions
        sendTextMessage,
        resendMessage: messagesHook.handleResendMessage,
        loadOlderMessages: messagesHook.loadOlderMessages,
        deleteMessage: messagesHook.handleDeleteMessage,
        uploadFile: messagesHook.handleFileUpload,
        quoteMessage: messagesHook.handleQuoteMessage,
        clearQuotedMessage: messagesHook.clearQuotedMessage,
        handleTypingChange: typingHook.handleInputChange
    }), [
        messagesHook.messages,
        messagesHook.isLoadingHistory,
        messagesHook.hasMoreMessages,
        messagesHook.initialLoadDone,
        messagesHook.quotedMessage,
        messagesHook.handleResendMessage,
        messagesHook.loadOlderMessages,
        messagesHook.handleDeleteMessage,
        messagesHook.handleFileUpload,
        messagesHook.handleQuoteMessage,
        messagesHook.clearQuotedMessage,
        messagesHook.lastScrollHeight,
        messagesHook.scrollPositionRef,
        connectionHook.connectionStatus,
        typingHook.typingIndicator,
        typingHook.handleInputChange,
        sendTextMessage
    ]);

    // Use createElement approach instead of JSX to avoid potential TypeScript issues
    return React.createElement(MessageContext.Provider,
        { value: contextValue },
        children
    );
};

// Hook for using the message context
export const useMessageContext = (): MessageContextType => {
    const context = useContext(MessageContext);
    if (context === undefined) {
        throw new Error('useMessageContext must be used within a MessageProvider');
    }
    return context;
};
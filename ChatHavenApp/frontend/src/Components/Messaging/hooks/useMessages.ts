import { useState, useRef, useCallback, useEffect } from 'react';
import WebSocketClient from '../../../Services/webSocketClient.ts';
import { deleteMessage } from '../../../Services/channelService.ts';
import {
    ChatMessage,
    WebSocketMessage,
    Selection,
    MessageStatus,
    RetryInfo,
    QuotedMessage
} from '../../../types/shared.ts';

// Constants for message retry
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 3000;

/**
 * Custom hook for managing messages state and operations
 */
export function useMessages(selection: Selection | null, username: string) {
    // State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [pendingMessages, setPendingMessages] = useState<Map<string, RetryInfo>>(new Map());
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [oldestMessageId, setOldestMessageId] = useState<string | null>(null);
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    const [quotedMessage, setQuotedMessage] = useState<QuotedMessage | null>(null);

    // Refs
    const processedMessageIds = useRef<Set<string>>(new Set());
    const lastScrollHeight = useRef<number>(0);
    const scrollPositionRef = useRef<number>(0);
    const fetchedForSelection = useRef<string | null>(null);
    const isConnectedRef = useRef(false);

    // Services
    const wsService = WebSocketClient.getInstance();

    // Function to track pending messages and handle retries
    const trackPendingMessage = useCallback(
        (messageData: WebSocketMessage, clientMessageId: string) => {
            const timeout = setTimeout(() => {
                setPendingMessages(prev => {
                    const pending = prev.get(clientMessageId);

                    if (pending && pending.attempts < MAX_RETRY_ATTEMPTS) {
                        console.log(`Retrying message ${clientMessageId}, attempt ${pending.attempts + 1}`);

                        if (wsService.isConnected()) {
                            wsService.send(messageData);
                        }

                        const updated = new Map(prev);
                        updated.set(clientMessageId, {
                            message: messageData,
                            attempts: pending.attempts + 1,
                            timeout: setTimeout(
                                () => trackPendingMessage(messageData, clientMessageId),
                                RETRY_DELAY_MS
                            ) as unknown as NodeJS.Timeout,
                            createdAt: messageData.createdAt || Date.now()
                        });
                        return updated;
                    } else {
                        setMessages(prevMsgs =>
                            prevMsgs.map(msg =>
                                msg.clientMessageId === clientMessageId ? { ...msg, status: 'failed' } : msg
                            )
                        );

                        const updated = new Map(prev);
                        updated.delete(clientMessageId);
                        return updated;
                    }
                });
            }, RETRY_DELAY_MS);

            setPendingMessages(prev => {
                const updated = new Map(prev);
                updated.set(clientMessageId, {
                    message: messageData,
                    attempts: 0,
                    timeout: timeout as unknown as NodeJS.Timeout,
                    createdAt: messageData.createdAt || Date.now()
                });
                return updated;
            });
        },
        [wsService]
    );

    // Helper function to check for duplicates
    const isDuplicate = useCallback((messageData: any): boolean => {
        // Check if we've already processed this message ID
        if (messageData._id && processedMessageIds.current.has(messageData._id)) {
            return true;
        }

        // Check if it's a message we sent that's already in our state
        if (
            messageData.clientMessageId &&
            messages.some(msg => msg.clientMessageId === messageData.clientMessageId)
        ) {
            return true;
        }

        // Mark as processed
        if (messageData._id) {
            processedMessageIds.current.add(messageData._id);
        }

        return false;
    }, [messages]);

    // Sending messages with client-side tracking
    const sendMessage = useCallback(
        (messageData: WebSocketMessage) => {
            if (!selection) return '';

            console.log('Sending message with data:', messageData);
            const clientMessageId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const messageWithId: WebSocketMessage = {
                ...messageData,
                clientMessageId,
                text: messageData.text || ''
            };

            if (wsService.isConnected()) {
                wsService.send(messageWithId);

                wsService.registerMessageStatusCallback(clientMessageId, status => {
                    console.log(`Received status update for message ${clientMessageId}:`, status);
                    setMessages(prevMsgs =>
                        prevMsgs.map(msg =>
                            msg.clientMessageId === clientMessageId
                                ? { ...msg, status: status as MessageStatus }
                                : msg
                        )
                    );
                });

                const newMessage: ChatMessage = {
                    _id: '', // Server will assign a real ID
                    text: messageWithId.text || '',
                    username,
                    createdAt: new Date(),
                    status: 'pending',
                    clientMessageId,
                    ...(messageData.fileName && {
                        fileName: messageData.fileName,
                        fileType: messageData.fileType,
                        fileSize: messageData.fileSize
                    }),
                    ...(messageData.quotedMessage && {
                        quotedMessage: {
                            _id: messageData.quotedMessage._id,
                            text: messageData.quotedMessage.text,
                            username: messageData.quotedMessage.username
                        }
                    })
                };

                setMessages(prev => [...prev, newMessage]);
            } else {
                // Add message to state with pending status
                const newMessage: ChatMessage = {
                    _id: '',
                    text: messageWithId.text || '',
                    username,
                    createdAt: new Date(),
                    status: 'pending',
                    clientMessageId,
                    ...(messageData.fileName && {
                        fileName: messageData.fileName,
                        fileType: messageData.fileType,
                        fileSize: messageData.fileSize
                    }),
                    ...(messageData.quotedMessage && {
                        quotedMessage: {
                            _id: messageData.quotedMessage._id,
                            text: messageData.quotedMessage.text,
                            username: messageData.quotedMessage.username
                        }
                    })
                };

                setMessages(prev => [...prev, newMessage]);

                // This will be queued by the service
                wsService.send(messageWithId);
            }

            return clientMessageId;
        },
        [selection, username, wsService]
    );

    // Function to handle message resend
    const handleResendMessage = useCallback(
        (message: ChatMessage) => {
            if (!selection) return;

            // Create a new message based on the failed one
            const newMessage: WebSocketMessage = {
                type: selection.type === 'directMessage' ? 'directMessage' : 'message',
                text: message.text,
                username,
                teamName: selection.teamName,
                ...(selection.type === 'directMessage'
                    ? { receiverUsername: selection.username || '' }
                    : { channelName: selection.channelName || '' })
            };

            // Remove the failed message
            setMessages(prev =>
                prev.filter(
                    msg =>
                        (msg._id && msg._id !== message._id) ||
                        (msg.clientMessageId && msg.clientMessageId !== message.clientMessageId)
                )
            );

            // Send the new message
            sendMessage(newMessage);
        },
        [selection, sendMessage, username]
    );

    // Function to load older messages
    const loadOlderMessages = useCallback(() => {
        if (!wsService.isConnected() || !selection || isLoadingHistory || !hasMoreMessages) {
            return;
        }

        setIsLoadingHistory(true);

        const historyRequest: WebSocketMessage =
            selection.type === 'channel'
                ? {
                    type: 'fetchHistory',
                    teamName: selection.teamName,
                    channelName: selection.channelName,
                    before: oldestMessageId || undefined,
                    limit: 25
                }
                : {
                    type: 'fetchHistory',
                    teamName: selection.teamName,
                    username: selection.username,
                    before: oldestMessageId || undefined,
                    limit: 25
                };

        wsService.send(historyRequest);

        // Store current scroll position for restoration
        lastScrollHeight.current = document.documentElement.scrollHeight;
        scrollPositionRef.current = window.scrollY;
    }, [selection, isLoadingHistory, hasMoreMessages, oldestMessageId, wsService]);

    // Fetch messages using WebSocket
    const fetchMessages = useCallback(() => {
        if (!selection || !wsService.isConnected()) {
            setMessages([]);
            setHasMoreMessages(false);
            setOldestMessageId(null);
            setInitialLoadDone(false);
            return;
        }

        setIsLoadingHistory(true);
        setInitialLoadDone(false);

        // Clear the processed message IDs set when starting a new fetch
        processedMessageIds.current = new Set();

        const historyRequest: WebSocketMessage =
            selection.type === 'channel'
                ? {
                    type: 'fetchHistory',
                    teamName: selection.teamName,
                    channelName: selection.channelName,
                    limit: 50
                }
                : {
                    type: 'fetchHistory',
                    teamName: selection.teamName,
                    username: selection.username,
                    limit: 50
                };

        console.log('Fetching messages:', historyRequest);
        wsService.send(historyRequest);
    }, [selection, wsService]);

    // Process history response from server
    const processHistoryResponse = useCallback((data: any) => {
        setIsLoadingHistory(false);
        setInitialLoadDone(true);

        // Process the messages
        const historyMessages = (data.messages || [])
            .filter((msg: any) => !isDuplicate(msg))
            .map((msg: any) => ({
                _id: msg._id,
                text: msg.text,
                username: msg.username,
                createdAt: new Date(msg.createdAt),
                status: msg.status || 'delivered',
                ...(msg.clientMessageId && { clientMessageId: msg.clientMessageId }),
                ...(msg.fileName && {
                    fileName: msg.fileName,
                    fileType: msg.fileType || 'application/octet-stream',
                    fileUrl: msg.fileUrl || '',
                    fileSize: msg.fileSize
                }),
                ...(msg.quotedMessage && {
                    quotedMessage: {
                        _id: msg.quotedMessage._id,
                        text: msg.quotedMessage.text,
                        username: msg.quotedMessage.username
                    }
                })
            }));

        // Even if there are no messages, set initialLoadDone to true
        if (historyMessages.length === 0) {
            setOldestMessageId(null);
            setHasMoreMessages(false);
            // Don't replace existing messages if we're paginating
            if (!data.before) {
                setMessages([]);
            }
        } else {
            // If paginating (loading older messages), we need to find the oldest message
            // If initial load, we'll use the first message from the response
            const oldestMessageForPagination = data.before
                ? historyMessages.reduce(
                    (
                        oldest: { createdAt: string | number | Date },
                        current: { createdAt: string | number | Date }
                    ) =>
                        new Date(oldest.createdAt).getTime() < new Date(current.createdAt).getTime()
                            ? oldest
                            : current
                )
                : historyMessages[0];

            setOldestMessageId(oldestMessageForPagination._id);

            // Update messages state based on whether this is pagination or initial load
            if (data.before) {
                // Pagination - prepend older messages
                setMessages(prev => [...historyMessages, ...prev]);
            } else {
                // Initial load - replace all messages
                setMessages(historyMessages);
            }

            // Update hasMoreMessages flag
            setHasMoreMessages(data.hasMore ?? false);
        }
    }, [isDuplicate]);

    // Handle file upload
    const handleFileUpload = useCallback((files: FileList) => {
        if (!files || !selection) return;

        console.log(`File upload triggered. ${files.length} file(s) selected.`);

        Array.from(files).forEach(file => {
            console.log('Processing file:', {
                name: file.name,
                type: file.type,
                size: `${(file.size / 1024).toFixed(2)} KB`
            });

            const reader = new FileReader();

            reader.onload = () => {
                const base64Content = reader.result as string;

                // Simple file size check (client-side validation)
                if (file.size > 10 * 1024 * 1024) { // 10MB limit
                    alert(`File ${file.name} is too large. Maximum size is 10MB.`);
                    return;
                }

                // Create a unique identifier for this file upload
                const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

                // Create message with file data
                const mediaMessage: WebSocketMessage = {
                    type: selection.type === 'directMessage' ? 'directMessage' : 'message',
                    text: `[File] ${file.name}`, // Text indicates this is a file message
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    fileData: base64Content,
                    teamName: selection.teamName,
                    uploadId, // Track the upload
                    ...(selection.type === 'directMessage'
                        ? { receiverUsername: selection.username }
                        : { channelName: selection.channelName }),
                    fileUrl: '' // Placeholder for server to fill in
                };

                // Track the start time of the upload
                const startTime = performance.now();

                // Send the message and get the client ID
                const clientMessageId = sendMessage(mediaMessage);

                // Register a callback to track when the server acknowledges the message
                wsService.registerMessageStatusCallback(clientMessageId, (status) => {
                    const endTime = performance.now();
                    const duration = (endTime - startTime) / 1000; // seconds

                    console.log(`Upload ${uploadId} ${status} in ${duration.toFixed(2)}s`, {
                        clientMessageId,
                        fileName: file.name,
                        fileSize: file.size,
                        status
                    });
                });
            };

            reader.onerror = (error) => {
                console.error('Error reading file:', error);
                alert(`Failed to read file ${file.name}`);
            };

            // Start reading the file as data URL
            reader.readAsDataURL(file);
        });
    }, [selection, sendMessage, wsService]);

    // Handle deleting messages
    const handleDeleteMessage = useCallback(async (messageId: string) => {
        if (!messageId || !selection || selection.type !== 'channel') return;

        try {
            if (selection.type === 'channel' && selection.channelName) {
                await deleteMessage(selection.teamName, selection.channelName, messageId);
            } else {
                console.error('No message selected for deletion.');
            }
            setMessages(prev => prev.filter(msg => msg._id !== messageId));
        } catch (err) {
            console.error('Failed to delete message', err);
        }
    }, [selection]);

    // Handle quoting messages
    const handleQuoteMessage = useCallback((messageId: string) => {
        if (!messageId) {
            console.warn('No message selected for quoting.');
            return;
        }

        const messageToQuote = messages.find(msg => msg._id === messageId);
        if (!messageToQuote) {
            console.warn('Selected message not found in the current message list.');
            return;
        }

        if (!messageToQuote.text || messageToQuote.text.trim() === '') {
            console.warn('Cannot quote an empty or non-text message.');
            return;
        }

        setQuotedMessage({
            _id: messageToQuote._id,
            text: messageToQuote.text,
            username: messageToQuote.username
        });

        // Focus on input field after quoting
        const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement | null;
        if (inputElement) {
            inputElement.focus();
        }
    }, [messages]);

    const clearQuotedMessage = useCallback(() => {
        setQuotedMessage(null);
    }, []);

    // Process incoming message from server
    const processIncomingMessage = useCallback((data: any) => {
        if (isDuplicate(data)) return;

        if (data.type === 'message') {
            // Check if we're in a channel at all
            if (!selection || selection.type !== 'channel') {
                return;
            }

            // Compare channel names - make this check less strict if needed
            if (selection.channelName !== data.channelName ||
                selection.teamName !== data.teamName) {
                console.log('Channel mismatch - not displaying message', {
                    selectionChannel: selection.channelName,
                    messageChannel: data.channelName,
                    selectionTeam: selection.teamName,
                    messageTeam: data.teamName
                });
                return;
            }
        } else if (data.type === 'directMessage') {
            // Only show DMs if we're in the correct DM conversation
            if (!selection || selection.type !== 'directMessage') {
                return;
            }

            // Check if this DM is relevant to the current conversation
            if (data.username !== username && data.username !== selection.username) {
                console.log('DM user mismatch - not displaying message', {
                    messageFrom: data.username,
                    currentUser: username,
                    selectedUser: selection.username
                });
                return;
            }
        }

        // Check if this is a message we sent (by matching usernames)
        if (data.username === username) {
            // Find pending message by matching text/content or clientMessageId
            const pendingMessage = messages.find(
                msg => (msg.status === 'pending' && msg.text === data.text && msg.username === data.username) ||
                    (msg.clientMessageId && msg.clientMessageId === data.clientMessageId)
            );

            if (pendingMessage) {
                // Update message status to sent
                setMessages(prev =>
                    prev.map(msg =>
                        (msg === pendingMessage ||
                            (msg.clientMessageId && msg.clientMessageId === data.clientMessageId))
                            ? {
                                ...msg,
                                _id: data._id,
                                status: 'sent',
                                ...(data.fileName && {
                                    fileName: data.fileName,
                                    fileType: data.fileType,
                                    fileUrl: data.fileUrl,
                                    fileSize: data.fileSize
                                }),
                                ...(msg.fileName && {
                                    fileName: msg.fileName,
                                    fileType: msg.fileType,
                                    fileUrl: data.fileUrl || msg.fileUrl || '',
                                    fileSize: msg.fileSize
                                }),
                                quotedMessage: data.quotedMessage ? {
                                    _id: data.quotedMessage._id,
                                    text: data.quotedMessage.text,
                                    username: data.quotedMessage.username
                                } : msg.quotedMessage
                            }
                            : msg
                    )
                );
            } else {
                // This is a new message from us (maybe from another client)
                setMessages(prev => [
                    ...prev,
                    {
                        _id: data._id,
                        text: data.text || '',
                        username: data.username || '',
                        createdAt: new Date(data.createdAt || new Date()),
                        status: 'sent',
                        // Include file information
                        ...(data.fileName && {
                            fileName: data.fileName,
                            fileType: data.fileType,
                            fileUrl: data.fileUrl,
                            fileSize: data.fileSize
                        }),
                        ...(data.quotedMessage && {
                            quotedMessage: {
                                _id: data.quotedMessage._id,
                                text: data.quotedMessage.text,
                                username: data.quotedMessage.username
                            }
                        })
                    }
                ]);
            }

            // Send delivery acknowledgment
            wsService.send({
                type: 'messageAck',
                messageId: data._id,
                status: 'delivered'
            });
        } else {
            // This is a message from someone else
            setMessages(prev => [
                ...prev,
                {
                    _id: data._id,
                    text: data.text || '',
                    username: data.username || '',
                    createdAt: new Date(data.createdAt || new Date()),
                    status: 'delivered',
                    // Include file information
                    ...(data.fileName && {
                        fileName: data.fileName,
                        fileType: data.fileType,
                        fileUrl: data.fileUrl,
                        fileSize: data.fileSize
                    }),
                    ...(data.quotedMessage && {
                        quotedMessage: {
                            _id: data.quotedMessage._id,
                            text: data.quotedMessage.text,
                            username: data.quotedMessage.username
                        }
                    })
                }
            ]);

            // Send read receipt
            if (data._id) {
                wsService.send({
                    type: 'messageAck',
                    messageId: data._id,
                    status: 'read'
                });
            }
        }
    }, [isDuplicate, messages, selection, username, wsService]);

    // Process message acknowledgment
    const processMessageAck = useCallback((data: any) => {
        // Update message status based on acknowledgment
        setMessages(prev =>
            prev.map(msg => (msg._id === data.messageId ? { ...msg, status: data.status } : msg))
        );
    }, []);

    // Process file upload completion
    const processFileUploadComplete = useCallback((data: any) => {
        console.log('🔔 File upload complete notification received:', {
            messageId: data.messageId,
            clientMessageId: data.clientMessageId,
            fileUrl: data.fileUrl,
            status: data.status
        });

        // Update the message with the file URL
        setMessages(prev =>
            prev.map(msg => {
                // Match by clientMessageId if available, otherwise try messageId
                const isMatch =
                    (data.clientMessageId && msg.clientMessageId === data.clientMessageId) ||
                    (data.messageId && msg._id === data.messageId);

                if (isMatch) {
                    console.log('⭐ Updating file message with URL:', {
                        messageId: msg._id,
                        clientMessageId: msg.clientMessageId,
                        oldFileUrl: msg.fileUrl,
                        newFileUrl: data.fileUrl,
                        newMessageId: data.messageId
                    });

                    return {
                        ...msg,
                        _id: data.messageId || msg._id, // Ensure we have the server-assigned ID
                        fileUrl: data.fileUrl,
                        status: 'sent'
                    };
                }
                return msg;
            })
        );
    }, []);

    // Process file updates
    const processFileUpdated = useCallback((data: any) => {
        // Find and update the message with edited file information
        setMessages(prev =>
            prev.map(msg =>
                msg._id === data.messageId
                    ? {
                        ...msg,
                        editedBy: data.editedBy,
                        editedAt: new Date(data.editedAt)
                    }
                    : msg
            )
        );
    }, []);

    // Cleanup on unmount or when selection changes
    useEffect(() => {
        return () => {
            // Clear any message retry timeouts
            pendingMessages.forEach(info => {
                if (info.timeout) {
                    clearTimeout(info.timeout as unknown as number);
                }
            });
        };
    }, [pendingMessages, selection]);

    // Reset when selection changes
    useEffect(() => {
        if (selection) {
            // Create a unique identifier for this selection
            const selectionKey = `${selection.teamName}/${selection.type}/${selection.type === 'channel' ? selection.channelName : selection.username
                }`;

            // If we've already fetched for this selection, don't fetch again
            if (fetchedForSelection.current === selectionKey) {
                console.log('Already fetched messages for this selection');
                return;
            }

            console.log('Selection changed, fetching messages for:', selection);
            // Clear previous messages when selection changes
            setMessages([]);
            setHasMoreMessages(false);
            setOldestMessageId(null);
            setInitialLoadDone(false);

            // Only fetch if we have a valid websocket connection
            if (wsService.isConnected()) {
                fetchMessages();
                fetchedForSelection.current = selectionKey;
            } else {
                // Mark that we need to fetch when connection is established
                fetchedForSelection.current = null;
            }
        }
    }, [selection, wsService, fetchMessages]);

    useEffect(() => {
        isConnectedRef.current = wsService.isConnected();
    }, [wsService]);

    useEffect(() => {
        if (isConnectedRef.current && selection && fetchedForSelection.current === null) {
            const selectionKey = `${selection.teamName}/${selection.type}/${selection.type === 'channel' ? selection.channelName : selection.username
                }`;

            console.log('Connection established, now fetching messages');
            fetchMessages();
            fetchedForSelection.current = selectionKey;
        }
    }, [selection, fetchMessages]);

    return {
        // State
        messages,
        isLoadingHistory,
        hasMoreMessages,
        initialLoadDone,
        quotedMessage,
        lastScrollHeight,
        scrollPositionRef,

        // Actions
        sendMessage,
        handleResendMessage,
        loadOlderMessages,
        fetchMessages,
        handleDeleteMessage,
        handleFileUpload,
        handleQuoteMessage,
        clearQuotedMessage,

        // Processors
        processHistoryResponse,
        processIncomingMessage,
        processMessageAck,
        processFileUploadComplete,
        processFileUpdated,
        isDuplicate
    };
}
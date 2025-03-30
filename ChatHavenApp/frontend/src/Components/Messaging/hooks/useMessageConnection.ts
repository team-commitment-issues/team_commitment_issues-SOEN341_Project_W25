import { useState, useRef, useCallback, useEffect } from 'react';
import WebSocketClient from '../../../Services/webSocketClient.ts';
import { Selection, WebSocketMessage } from '../../../types/shared.ts';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

/**
 * Custom hook for managing WebSocket connections for messaging
 */
export function useMessageConnection(
    selection: Selection | null,
    onMessageReceived: (data: any) => void
) {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

    // Refs
    const heartbeatInterval = useRef<number | null>(null);
    const messageSubscriptionRef = useRef<string | null>(null);
    const currentSelection = useRef<Selection | null>(null);
    const isMounted = useRef(true);

    // Services
    const wsService = WebSocketClient.getInstance();

    // Clear heartbeat interval
    const clearHeartbeat = useCallback(() => {
        if (heartbeatInterval.current) {
            if (heartbeatInterval.current !== null) {
                window.clearInterval(heartbeatInterval.current);
            }
            heartbeatInterval.current = null;
        }
    }, []);

    // Send join message to server
    const sendJoinMessage = useCallback(
        (sel: Selection) => {
            if (!wsService.isConnected() || !sel) return;

            const joinMessage: WebSocketMessage =
                sel.type === 'channel'
                    ? {
                        type: 'join',
                        teamName: sel.teamName,
                        channelName: sel.channelName
                    }
                    : {
                        type: 'joinDirectMessage',
                        teamName: sel.teamName,
                        username: sel.username
                    };

            wsService.send(joinMessage);
        },
        [wsService]
    );

    // Setup WebSocket message handlers
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found, cannot connect to WebSocket');
            return;
        }

        const handleConnection = () => {
            console.log('WebSocket connected successfully');
            setConnectionStatus('connected');

            // If we have a selection, join the channel or DM
            if (selection) {
                console.log('Joining on connection:', selection);
                sendJoinMessage(selection);
            }
        };

        const handleDisconnection = () => {
            console.log('WebSocket disconnected');
            setConnectionStatus('disconnected');
        };

        const handleError = (error: any) => {
            console.error('WebSocket error:', error);
            setConnectionStatus('disconnected');
        };

        // Set connection status based on current state
        const isConnected = wsService.isConnected();
        console.log('Initial connection status:', isConnected ? 'connected' : 'connecting');
        setConnectionStatus(isConnected ? 'connected' : 'connecting');

        // Add event listeners
        wsService.addConnectionListener(handleConnection);
        wsService.addDisconnectionListener(handleDisconnection);
        wsService.addErrorListener(handleError);

        // Store subscription reference for cleanup
        messageSubscriptionRef.current = wsService.subscribe('*', onMessageReceived);
        console.log('Subscribed to all WebSocket messages');

        // Ensure we're connected
        if (!isConnected) {
            console.log('Connecting to WebSocket...');
            wsService.connect(token).catch((error: any) => {
                console.error('Failed to connect to WebSocket:', error);
                setConnectionStatus('disconnected');
            });
        } else {
            console.log('Already connected to WebSocket');
        }

        return () => {
            console.log('Cleaning up WebSocket listeners');
            wsService.removeConnectionListener(handleConnection);
            wsService.removeDisconnectionListener(handleDisconnection);
            wsService.removeErrorListener(handleError);

            // Unsubscribe from messages
            if (messageSubscriptionRef.current) {
                wsService.unsubscribe(messageSubscriptionRef.current);
                messageSubscriptionRef.current = null;
                console.log('Unsubscribed from WebSocket messages');
            }
        };
    }, [onMessageReceived, selection, sendJoinMessage, wsService]);

    // Setup cleanup on unmount
    useEffect(() => {
        isMounted.current = true;

        // Setup heartbeat
        heartbeatInterval.current = wsService.setupHeartbeat(30000) as unknown as number;

        return () => {
            isMounted.current = false;
            clearHeartbeat();
        };
    }, [clearHeartbeat, wsService]);

    // Handle channel/DM switching
    useEffect(() => {
        // When no selection is made, there's nothing to do
        if (!selection) {
            return;
        }

        if (!wsService.isConnected()) return;

        const prevSelection = currentSelection.current;
        currentSelection.current = selection;

        if (!prevSelection) {
            // First selection, send join
            sendJoinMessage(selection);
            return;
        }

        const hasSelectionChanged =
            prevSelection.type !== selection.type ||
            prevSelection.teamName !== selection.teamName ||
            (selection.type === 'channel' &&
                prevSelection.type === 'channel' &&
                prevSelection.channelName !== selection.channelName) ||
            (selection.type === 'directMessage' &&
                prevSelection.type === 'directMessage' &&
                prevSelection.username !== selection.username);

        if (hasSelectionChanged) {
            console.log('Selection changed, sending join message');
            sendJoinMessage(selection);
        }
    }, [selection, sendJoinMessage, wsService]);

    return {
        connectionStatus,
        sendJoinMessage,
        wsService
    };
}
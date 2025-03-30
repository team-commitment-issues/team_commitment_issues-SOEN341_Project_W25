// Components/UI/FileAttachment/useEditLock.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import WebSocketClient from '../../../Services/webSocketClient.ts';
import { Selection } from '../../../types/shared.ts';

interface EditLockInfo {
    username: string;
    acquiredAt: Date;
}

interface EditHistoryEntry {
    username: string;
    timestamp: Date;
}

interface EditedInfo {
    editedBy: string;
    editedAt: Date;
}

interface UseEditLockOptions {
    messageId?: string;
    fileName: string;
    username: string;
    selection?: Selection | null;
}

interface UseEditLockResult {
    editLock: EditLockInfo | null;
    isEditing: boolean;
    editLoading: boolean;
    isReleasingLock: boolean;
    editHistory: EditHistoryEntry[];
    editedInfo: EditedInfo | null;
    requestEditLock: () => void;
    releaseEditLock: () => void;
    saveEditedContent: (content: string) => void;
    fetchEditHistory: () => void;
    setEditedInfo: (info: EditedInfo | null) => void;
}

export const useEditLock = ({
    messageId,
    fileName,
    username,
    selection
}: UseEditLockOptions): UseEditLockResult => {
    const [editLock, setEditLock] = useState<EditLockInfo | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [isReleasingLock, setIsReleasingLock] = useState(false);
    const [editHistory, setEditHistory] = useState<EditHistoryEntry[]>([]);
    const [editedInfo, setEditedInfo] = useState<EditedInfo | null>(null);

    const wsService = WebSocketClient.getInstance();
    const currentLockUsernameRef = useRef<string | undefined>(undefined);
    const lockReleasedRef = useRef(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (editLock) {
            currentLockUsernameRef.current = editLock.username;
        } else {
            currentLockUsernameRef.current = undefined;
        }
    }, [editLock]);

    const requestEditLock = useCallback(() => {
        if (!messageId) return;

        try {
            setEditLoading(true);

            // Prepare the request with additional selection info
            const lockRequest: any = {
                type: 'requestEditLock',
                messageId,
                fileName
            };

            // Add selection context if available
            if (selection) {
                lockRequest.teamName = selection.teamName;

                if (selection.type === 'channel' && selection.channelName) {
                    lockRequest.channelName = selection.channelName;
                }

                // For direct messages, add an indicator
                if (selection.type === 'directMessage' && selection.username) {
                    lockRequest.directMessage = true;
                    lockRequest.receiverUsername = selection.username;
                }
            }

            console.log('Requesting edit lock with context:', lockRequest);

            // Send WebSocket message to request edit lock
            wsService.send(lockRequest);

            // Response will be handled by websocket subscription
        } catch (error) {
            console.error('Error requesting edit lock:', error);
            setEditLoading(false);
        }
    }, [messageId, fileName, selection, wsService]);

    const releaseEditLock = useCallback(() => {
        if (isReleasingLock || !messageId) return;

        setIsReleasingLock(true);

        const releaseRequest: any = {
            type: 'releaseEditLock',
            messageId,
            fileName
        };

        // Add selection context if available
        if (selection) {
            releaseRequest.teamName = selection.teamName;

            if (selection.type === 'channel' && selection.channelName) {
                releaseRequest.channelName = selection.channelName;
            }

            // For direct messages, add an indicator
            if (selection.type === 'directMessage' && selection.username) {
                releaseRequest.directMessage = true;
                releaseRequest.receiverUsername = selection.username;
            }
        }

        wsService.send(releaseRequest);

        // Reset after a short delay to prevent multiple calls
        setTimeout(() => {
            setIsReleasingLock(false);
        }, 500);

        // Optimistically update UI
        setEditLock(null);
        setIsEditing(false);
        lockReleasedRef.current = true;
    }, [messageId, fileName, wsService, isReleasingLock, selection]);

    const saveEditedContent = useCallback((content: string) => {
        if (!messageId) return;

        // Prepare update request with selection info
        const updateRequest: any = {
            type: 'updateFileContent',
            messageId,
            fileName,
            content
        };

        // Add selection context if available
        if (selection) {
            updateRequest.teamName = selection.teamName;

            if (selection.type === 'channel' && selection.channelName) {
                updateRequest.channelName = selection.channelName;
            }

            // For direct messages, add an indicator
            if (selection.type === 'directMessage' && selection.username) {
                updateRequest.directMessage = true;
                updateRequest.receiverUsername = selection.username;
            }
        }

        console.log('Saving file content with context:', updateRequest);

        // Send WebSocket message with edited content
        wsService.send(updateRequest);

        // Release lock after save
        releaseEditLock();

        // Immediately update edit info optimistically
        setEditedInfo({
            editedBy: username,
            editedAt: new Date()
        });
    }, [messageId, fileName, selection, wsService, releaseEditLock, username]);

    const fetchEditHistory = useCallback(() => {
        if (!messageId) return;

        console.log('Fetching edit history for message:', messageId);
        wsService.send({
            type: 'getFileEditHistory',
            messageId
        });
    }, [messageId, wsService]);

    // Subscribe to WebSocket messages related to file editing
    useEffect(() => {
        if (!messageId) return;

        lockReleasedRef.current = false;

        const handleEditLockResponse = (data: any) => {
            setEditLoading(false);

            if (data.type === 'editLockResponse' && data.messageId === messageId) {
                if (data.granted) {
                    setEditLock({
                        username: username,
                        acquiredAt: new Date()
                    });
                    setIsEditing(true);
                } else {
                    // Lock denied, update UI to show who has the lock
                    setEditLock({
                        username: data.lockedBy,
                        acquiredAt: new Date(data.lockedAt || Date.now())
                    });
                    alert(`File is currently being edited by ${data.lockedBy}`);
                }
            }
        };

        const handleEditLockUpdate = (data: any) => {
            if (data.type === 'editLockUpdate' && data.messageId === messageId) {
                console.log('Received edit lock update:', data);

                if (data.locked) {
                    setEditLock({
                        username: data.username,
                        acquiredAt: new Date(data.acquiredAt || Date.now())
                    });
                    if (isEditing && data.username !== username) {
                        setIsEditing(false);
                    }
                } else {
                    // Lock was released
                    setEditLock(null);
                    console.log('Edit lock was released for message:', messageId);
                }
            }
        };

        const handleFileUpdated = (data: any) => {
            if (data.type === 'fileUpdated' && data.messageId === messageId) {
                console.log('File updated notification received:', data);

                // Update edited by information
                if (data.editedBy) {
                    // Force immediate UI update with edited info
                    const editTime = data.editedAt ? new Date(data.editedAt) : new Date();
                    setEditedInfo({
                        editedBy: data.editedBy,
                        editedAt: editTime
                    });
                }
            }
        };

        const handleFileEditHistory = (data: any) => {
            if (data.type === 'fileEditHistory' && data.messageId === messageId) {
                console.log('Received file edit history:', data.history);

                // Map the history entries with proper date objects
                const parsedHistory = data.history.map((entry: any) => ({
                    username: entry.username,
                    timestamp: new Date(entry.timestamp),
                    description: entry.description || 'Updated file content',
                    contentHash: entry.contentHash,
                    fileSize: entry.fileSize
                }));

                setEditHistory(parsedHistory);
                console.log('Updated edit history state with parsed data');
            }
        };

        // Subscribe to relevant message types
        const editLockSubId = wsService.subscribe('editLockResponse', handleEditLockResponse);
        const editLockUpdateSubId = wsService.subscribe('*', (data) => {
            if (data.type === 'editLockUpdate') {
                handleEditLockUpdate(data);
            }
        });
        const fileUpdatedSubId = wsService.subscribe('fileUpdated', handleFileUpdated);
        const historyResponseSubId = wsService.subscribe('fileEditHistory', handleFileEditHistory);

        console.log(`Subscribed to WebSocket events for messageId: ${messageId}`);

        return () => {
            // Unsubscribe when component unmounts
            wsService.unsubscribe(editLockSubId);
            wsService.unsubscribe(editLockUpdateSubId);
            wsService.unsubscribe(fileUpdatedSubId);
            wsService.unsubscribe(historyResponseSubId);

            console.log(`Unsubscribed from WebSocket events for messageId: ${messageId}`);

            // Release lock if we have it and component unmounts
            if (!lockReleasedRef.current &&
                currentLockUsernameRef.current === username &&
                !isMountedRef.current) {
                lockReleasedRef.current = true;
                releaseEditLock();
            }
        };
    }, [messageId, username, wsService, releaseEditLock, isEditing]);

    return {
        editLock,
        isEditing,
        editLoading,
        isReleasingLock,
        editHistory,
        editedInfo,
        requestEditLock,
        releaseEditLock,
        saveEditedContent,
        fetchEditHistory,
        setEditedInfo
    };
};
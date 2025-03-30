// Components/UI/FileAttachment.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../Context/ThemeContext.tsx';
import FileEditor from './FileEditor.tsx';
import { useUser } from '../../Context/UserContext.tsx';
import WebSocketClient from '../../Services/webSocketClient.ts';
import '../../Styles/FileAttachment.css';

interface FileAttachmentProps {
    fileName: string;
    fileType: string;
    fileUrl: string;
    fileSize?: number;
    uploadStatus?: 'pending' | 'completed' | 'error';
    messageId?: string;
    editedBy?: string;
    editedAt?: Date;
}

interface EditLockInfo {
    username: string;
    acquiredAt: Date;
}

const TEXT_FILE_EXTENSIONS = [
    '.txt', '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.json', '.md',
    '.csv', '.xml', '.yml', '.yaml', '.sh', '.bash', '.py', '.java', '.c',
    '.cpp', '.h', '.cs', '.php', '.rb', '.go', '.rust', '.swift'
];

const isImageFile = (fileType: string): boolean => {
    return fileType.startsWith('image/');
};

const isTextFile = (fileName: string): boolean => {
    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    return TEXT_FILE_EXTENSIONS.includes(extension);
};

const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';

    if (bytes < 1024) {
        return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
};

const FileAttachment: React.FC<FileAttachmentProps> = ({
    fileName,
    fileType,
    fileUrl,
    fileSize,
    uploadStatus = fileUrl ? 'completed' : 'pending',
    messageId,
    editedBy,
    editedAt
}) => {
    const { theme } = useTheme();
    const { userData } = useUser();
    const username = userData?.username || '';
    const [showPreview, setShowPreview] = useState(false);
    const [textContent, setTextContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [imageBlob, setImageBlob] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<string | null>(null);
    const [isReleasingLock, setIsReleasingLock] = useState(false);

    // New state for editing functionality
    const [isEditing, setIsEditing] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [editLock, setEditLock] = useState<EditLockInfo | null>(null);

    const isFetchingRef = useRef(false);
    const hasAttemptedFetchRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const lockReleasedRef = useRef(false);
    const isMountedRef = useRef(true);
    const currentLockUsernameRef = useRef<string | undefined>(undefined);

    // WebSocket client for edit lock communication
    const wsService = WebSocketClient.getInstance();

    const getAuthenticatedUrl = (url: string, inline: boolean = false): string => {
        if (!url || url.trim() === '') {
            console.error('Invalid file URL - received empty or null URL');
            return '#pending-upload'; // Return a placeholder
        }

        // Make sure the URL starts with / if it's a relative path
        const normalizedUrl = url.startsWith('/') ? url : `/${url}`;

        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found in localStorage');
        }

        // Add query parameters
        const separator = normalizedUrl.includes('?') ? '&' : '?';
        const authenticatedUrl = `${normalizedUrl}${separator}token=${token}${inline ? '&inline=true' : ''}`;

        return authenticatedUrl;
    };

    const handleRetry = () => {
        setImageError(false);
        hasAttemptedFetchRef.current = false;
        setDebugInfo(null);

        setShowPreview(false);
        setTimeout(() => setShowPreview(true), 50);
    };

    const UploadStatusIndicator = () => {
        if (uploadStatus === 'pending') {
            return (
                <div className={`upload-status status-pending ${theme}`}>
                    <span>Uploading... Please wait</span>
                </div>
            );
        } else if (uploadStatus === 'error') {
            return (
                <div className={`upload-status status-error ${theme}`}>
                    <span>Upload failed. Try again.</span>
                </div>
            );
        }
        return null; // No indicator needed for complete status
    };

    const fetchFileContent = useCallback(async () => {
        if (!isTextFile(fileName) || !fileUrl) {
            return;
        }

        try {
            setLoading(true);

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            abortControllerRef.current = new AbortController();

            const authUrl = getAuthenticatedUrl(fileUrl, true);
            console.log('Fetching text file from:', authUrl);

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await fetch(authUrl, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Accept': 'text/plain,text/*;q=0.9,*/*;q=0.8',
                    'Cache-Control': 'no-cache'
                },
                credentials: 'include',
                signal: abortControllerRef.current.signal
            });

            if (response.status === 429) {
                throw new Error('Too many requests - rate limit exceeded. Please try again later.');
            }

            if (!response.ok) {
                throw new Error(`Failed to fetch file: ${response.statusText} (${response.status})`);
            }

            const content = await response.text();

            if (content.trim().toLowerCase().startsWith('<!doctype html>')) {
                throw new Error('Received HTML content instead of text file. Authentication may have failed.');
            }

            setTextContent(content);
            return content;
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                console.log('Text fetch aborted');
                return;
            }

            console.error('Error fetching file:', error);
            alert('Failed to load file content: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setLoading(false);
        }
    }, [fileName, fileUrl]);

    // New function to request edit lock
    const requestEditLock = async () => {
        if (!messageId || !isTextFile(fileName)) return;

        try {
            setEditLoading(true);

            // Send WebSocket message to request edit lock
            wsService.send({
                type: 'requestEditLock',
                messageId,
                fileName
            });

            // Wait for response (handled in useEffect)
        } catch (error) {
            console.error('Error requesting edit lock:', error);
            setEditLoading(false);
        }
    };

    // Function to release edit lock
    const releaseEditLock = useCallback(() => {
        if (isReleasingLock || !messageId) return;

        setIsReleasingLock(true);

        wsService.send({
            type: 'releaseEditLock',
            messageId,
            fileName
        });

        // Reset after a short delay to prevent multiple calls
        setTimeout(() => {
            setIsReleasingLock(false);
        }, 500);

        // Optimistically update UI
        setEditLock(null);
        setIsEditing(false);
    }, [messageId, fileName, wsService, isReleasingLock]);

    // Function to save edited content
    const saveEditedContent = async (content: string) => {
        if (!messageId) return;

        // Send WebSocket message with edited content
        wsService.send({
            type: 'updateFileContent',
            messageId,
            fileName,
            content
        });

        // Release lock after save
        releaseEditLock();
    };

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

                    // Fetch the file content for editing if not already loaded
                    if (!textContent) {
                        fetchFileContent();
                    }
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
                if (data.locked) {
                    setEditLock({
                        username: data.username,
                        acquiredAt: new Date(data.acquiredAt || Date.now())
                    });
                } else {
                    setEditLock(null);
                }
            }
        };

        const handleFileUpdated = (data: any) => {
            if (data.type === 'fileUpdated' && data.messageId === messageId) {
                // Clear cached content to force reload on next view
                setTextContent(null);
                hasAttemptedFetchRef.current = false;
            }
        };

        // Subscribe to relevant message types
        const editLockSubId = wsService.subscribe('editLockResponse', handleEditLockResponse);
        const editLockUpdateSubId = wsService.subscribe('editLockUpdate', handleEditLockUpdate);
        const fileUpdatedSubId = wsService.subscribe('fileUpdated', handleFileUpdated);

        return () => {
            // Unsubscribe when component unmounts
            wsService.unsubscribe(editLockSubId);
            wsService.unsubscribe(editLockUpdateSubId);
            wsService.unsubscribe(fileUpdatedSubId);

            // Release lock if we have it and component unmounts
            if (!lockReleasedRef.current &&
                currentLockUsernameRef.current === username &&
                !isMountedRef.current) {
                lockReleasedRef.current = true;
                releaseEditLock();
            }
        };
    }, [messageId, username, textContent, wsService, releaseEditLock, fetchFileContent]);

    useEffect(() => {
        const fetchImageInEffect = async () => {
            if (isFetchingRef.current) {
                console.log('Skipping duplicate image fetch request');
                return;
            }

            if (hasAttemptedFetchRef.current) {
                console.log('Skipping repeat fetch attempt for same preview session');
                return;
            }

            try {
                setLoading(true);
                setImageError(false);
                setDebugInfo(null);
                isFetchingRef.current = true;
                hasAttemptedFetchRef.current = true;

                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                }

                abortControllerRef.current = new AbortController();

                const authUrl = getAuthenticatedUrl(fileUrl, true);
                console.log('Fetching image from:', authUrl);

                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Authentication token not found');
                }

                await new Promise(resolve => setTimeout(resolve, 300));

                const response = await fetch(authUrl, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Accept': 'image/*',
                        'Cache-Control': 'no-cache'
                    },
                    credentials: 'include',
                    signal: abortControllerRef.current.signal
                });

                const responseInfo = {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries([...response.headers.entries()]),
                    type: response.type,
                    url: response.url
                };

                console.log('Image fetch response:', responseInfo);
                setDebugInfo(`Status: ${response.status} ${response.statusText}, Content-Type: ${response.headers.get('content-type')}`);

                if (!response.ok) {
                    if (response.status === 429) {
                        throw new Error('Too many requests - rate limit exceeded. Please try again later.');
                    }
                    throw new Error(`Failed to fetch image: ${response.statusText} (${response.status})`);
                }

                const blob = await response.blob();
                console.log('Received image blob:', {
                    size: blob.size,
                    type: blob.type
                });

                if (blob.size === 0) {
                    throw new Error('Received empty image data');
                }

                const imageUrl = URL.createObjectURL(blob);
                setImageBlob(imageUrl);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    console.log('Image fetch aborted');
                    return;
                }

                console.error('Error fetching image:', error);
                setImageError(true);
                setDebugInfo((error instanceof Error) ? error.message : 'Unknown error');
            } finally {
                setLoading(false);
                isFetchingRef.current = false;
            }
        };

        if (isImageFile(fileType) && showPreview) {
            if (!showPreview) {
                hasAttemptedFetchRef.current = false;
            }

            fetchImageInEffect();
        }

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            if (imageBlob) {
                URL.revokeObjectURL(imageBlob);
                setImageBlob(null);
            }

            if (!showPreview) {
                hasAttemptedFetchRef.current = false;
            }
        };
    }, [fileType, fileUrl, showPreview, imageBlob]);


    const handleOpenFile = async () => {
        if (isTextFile(fileName) && !textContent && !showPreview) {
            try {
                setLoading(true);

                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                }

                abortControllerRef.current = new AbortController();

                const authUrl = getAuthenticatedUrl(fileUrl, true);
                console.log('Fetching text file from:', authUrl);

                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Authentication token not found');
                }

                await new Promise(resolve => setTimeout(resolve, 300));

                const response = await fetch(authUrl, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Accept': 'text/plain,text/*;q=0.9,*/*;q=0.8',
                        'Cache-Control': 'no-cache'
                    },
                    credentials: 'include',
                    signal: abortControllerRef.current.signal
                });

                if (response.status === 429) {
                    throw new Error('Too many requests - rate limit exceeded. Please try again later.');
                }

                if (!response.ok) {
                    throw new Error(`Failed to fetch file: ${response.statusText} (${response.status})`);
                }

                const content = await response.text();

                if (content.trim().toLowerCase().startsWith('<!doctype html>')) {
                    throw new Error('Received HTML content instead of text file. Authentication may have failed.');
                }

                setTextContent(content);
                setShowPreview(true);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    console.log('Text fetch aborted');
                    return;
                }

                console.error('Error fetching file:', error);
                alert('Failed to load file content: ' + (error instanceof Error ? error.message : 'Unknown error'));
            } finally {
                setLoading(false);
            }
        } else {
            setShowPreview(!showPreview);

            if (showPreview) {
                hasAttemptedFetchRef.current = false;
            }
        }
    };

    // Handle canceling edit
    const handleCancelEdit = () => {
        releaseEditLock();
    };

    // Is text file and eligible for editing
    const canEdit = isTextFile(fileName) &&
        uploadStatus === 'completed' &&
        fileUrl &&
        fileUrl !== '#pending-upload' &&
        fileUrl !== '' &&
        (!editLock || editLock.username === username);

    // Determine if we should show edit button
    const showEditButton = isTextFile(fileName) && messageId && uploadStatus === 'completed';

    const getFileIcon = () => {
        if (isImageFile(fileType)) return '🖼️';
        if (isTextFile(fileName)) return '📄';
        if (fileType.includes('pdf')) return '📕';
        if (fileType.includes('word') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) return '📘';
        if (fileType.includes('excel') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return '📊';
        if (fileType.includes('video')) return '🎬';
        if (fileType.includes('audio')) return '🎵';
        if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar')) return '🗜️';
        return '📎';
    };

    return (
        <div className={`file-attachment-container ${theme}`}>
            <div className={`file-info ${showPreview ? 'preview-visible' : ''} ${theme}`}>
                <div className="file-icon">{getFileIcon()}</div>
                <div className="file-details">
                    <div className={`file-name ${theme}`}>{fileName}</div>
                    {editedBy && !editLock && (
                        <div className={`edited-info ${theme}`} title={editedAt ? `Last edited on ${editedAt.toLocaleString()}` : ''}>
                            Edited by {editedBy}
                        </div>
                    )}
                    {editLock && editLock.username !== username && (
                        <div className={`editing-indicator ${theme}`}>
                            Currently being edited by {editLock.username}
                        </div>
                    )}
                </div>
                {fileSize && <div className={`file-size ${theme}`}>{formatFileSize(fileSize)}</div>}

                {isImageFile(fileType) ? (
                    <button
                        className={`file-button ${theme} ${(!fileUrl || fileUrl === '#pending-upload' || fileUrl === '' || loading) ? 'button-disabled' : ''}`}
                        onClick={() => {
                            if (showPreview) {
                                hasAttemptedFetchRef.current = false;
                            }
                            if (!fileUrl || fileUrl === '#pending-upload' || fileUrl === '') {
                                alert('File is still uploading, please wait...');
                                return;
                            }
                            setShowPreview(!showPreview);
                        }}
                        disabled={loading || !fileUrl || fileUrl === '#pending-upload' || fileUrl === ''}
                    >
                        {fileUrl && fileUrl !== '#pending-upload' && fileUrl !== ''
                            ? (showPreview ? 'Hide' : 'View')
                            : 'Uploading...'}
                    </button>
                ) : isTextFile(fileName) ? (
                    <>
                        <button
                            className={`file-button ${theme} ${(!fileUrl || fileUrl === '#pending-upload' || fileUrl === '' || loading) ? 'button-disabled' : ''}`}
                            onClick={handleOpenFile}
                            disabled={loading || !fileUrl || fileUrl === '#pending-upload' || fileUrl === ''}
                        >
                            {loading ? 'Loading...' :
                                (!fileUrl || fileUrl === '#pending-upload' || fileUrl === '') ? 'Uploading...' :
                                    (showPreview ? 'Close' : 'Open')}
                        </button>

                        {/* Edit button for text files */}
                        {showEditButton && (
                            <button
                                className={`file-button edit-button ${theme} ${!canEdit || editLoading || isEditing ? 'button-disabled' : ''}`}
                                onClick={requestEditLock}
                                disabled={!canEdit || editLoading || isEditing}
                                title={
                                    editLock && editLock.username !== username
                                        ? `File is being edited by ${editLock.username}`
                                        : 'Edit file content'
                                }
                            >
                                {editLoading ? 'Loading...' : isEditing ? 'Editing...' : 'Edit'}
                            </button>
                        )}
                    </>
                ) : (
                    <a
                        href={(!fileUrl || fileUrl === '#pending-upload' || fileUrl === '') ? '#' : getAuthenticatedUrl(fileUrl)}
                        className={`file-button file-download-link ${theme} ${(!fileUrl || fileUrl === '#pending-upload' || fileUrl === '') ? 'button-disabled' : ''}`}
                        download={fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                            if (!fileUrl || fileUrl === '#pending-upload' || fileUrl === '') {
                                e.preventDefault();
                                alert('File is still uploading, please wait...');
                            }
                        }}
                    >
                        {(!fileUrl || fileUrl === '#pending-upload' || fileUrl === '') ? 'Uploading...' : 'Download'}
                    </a>
                )}
            </div>

            {uploadStatus !== 'completed' && <UploadStatusIndicator />}

            {/* Preview section */}
            {showPreview && !isEditing && (
                <div>
                    {isImageFile(fileType) && !imageError && !loading && imageBlob && (
                        <div className="image-container">
                            <img
                                src={imageBlob}
                                alt={fileName}
                                className="preview-image"
                            />
                        </div>
                    )}

                    {isImageFile(fileType) && loading && (
                        <div className={`text-preview ${theme} centered-text`}>
                            Loading image...
                        </div>
                    )}

                    {isImageFile(fileType) && imageError && (
                        <div className={`error-container ${theme}`}>
                            <div style={{ marginBottom: '10px' }}>Failed to load image</div>
                            <button
                                className={`file-button ${theme}`}
                                onClick={handleRetry}
                                style={{ marginRight: '10px' }}
                            >
                                Try Again
                            </button>
                            <a
                                href={getAuthenticatedUrl(fileUrl)}
                                className={`file-button file-download-link ${theme}`}
                                download={fileName}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Download Instead
                            </a>
                        </div>
                    )}

                    {isTextFile(fileName) && textContent && (
                        <div className={`text-preview ${theme}`}>{textContent}</div>
                    )}

                    {isTextFile(fileName) && loading && (
                        <div className={`text-preview ${theme} centered-text`}>
                            Loading content...
                        </div>
                    )}

                    {/* Debug information for images */}
                    {isImageFile(fileType) && debugInfo && (
                        <div className={`debug-container ${theme}`}>
                            <strong>Debug Info:</strong> {debugInfo}
                        </div>
                    )}
                </div>
            )}

            {/* File editor component */}
            {isEditing && textContent !== null && (
                <FileEditor
                    fileName={fileName}
                    fileContent={textContent}
                    onSave={saveEditedContent}
                    onCancel={handleCancelEdit}
                    loading={editLoading}
                />
            )}
        </div>
    );
};

export default FileAttachment;
// Components/UI/FileAttachment.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../Context/ThemeContext.tsx';

interface FileAttachmentProps {
    fileName: string;
    fileType: string;
    fileUrl: string;
    fileSize?: number;
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
    fileSize
}) => {
    const { theme } = useTheme();
    const [showPreview, setShowPreview] = useState(false);
    const [textContent, setTextContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [imageBlob, setImageBlob] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<string | null>(null);

    const isFetchingRef = useRef(false);
    const hasAttemptedFetchRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const getAuthenticatedUrl = (url: string, inline: boolean = false): string => {
        if (!url || url.trim() === '') {
            console.error('Invalid file URL - received empty or null URL');
            return '#'; // Return a placeholder
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


    const containerStyle: React.CSSProperties = {
        marginTop: '8px',
        marginBottom: '8px',
        borderRadius: '4px',
        overflow: 'hidden',
        border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
        backgroundColor: theme === 'dark' ? '#2a2a2a' : '#f5f5f5',
    };

    const fileInfoStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: showPreview ? `1px solid ${theme === 'dark' ? '#444' : '#ddd'}` : 'none',
    };

    const fileIconStyle: React.CSSProperties = {
        marginRight: '8px',
        fontSize: '20px',
    };

    const fileNameStyle: React.CSSProperties = {
        flexGrow: 1,
        fontSize: '14px',
        fontWeight: 500,
        color: theme === 'dark' ? '#ddd' : '#333',
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
    };

    const fileSizeStyle: React.CSSProperties = {
        fontSize: '12px',
        color: theme === 'dark' ? '#aaa' : '#777',
        marginLeft: '8px',
        whiteSpace: 'nowrap',
    };

    const buttonStyle: React.CSSProperties = {
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: theme === 'dark' ? '#7ab4fa' : '#0066cc',
        padding: '4px 8px',
        fontSize: '13px',
        marginLeft: '8px',
        borderRadius: '4px',
    };

    const textPreviewStyle: React.CSSProperties = {
        padding: '10px',
        maxHeight: '300px',
        overflowY: 'auto',
        backgroundColor: theme === 'dark' ? '#1e1e1e' : '#fff',
        color: theme === 'dark' ? '#ddd' : '#333',
        fontSize: '13px',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    };

    const errorContainerStyle: React.CSSProperties = {
        padding: '20px',
        textAlign: 'center',
        backgroundColor: theme === 'dark' ? '#2a2a2a' : '#f8f8f8',
        color: theme === 'dark' ? '#f87c7c' : '#d32f2f',
    };

    const debugContainerStyle: React.CSSProperties = {
        padding: '10px',
        fontSize: '12px',
        backgroundColor: theme === 'dark' ? '#333' : '#eee',
        color: theme === 'dark' ? '#ccc' : '#555',
        borderTop: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
    };

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
        <div style={containerStyle}>
            <div style={fileInfoStyle}>
                <div style={fileIconStyle}>{getFileIcon()}</div>
                <div style={fileNameStyle}>{fileName}</div>
                {fileSize && <div style={fileSizeStyle}>{formatFileSize(fileSize)}</div>}

                {isImageFile(fileType) ? (
                    <button
                        style={buttonStyle}
                        onClick={() => {
                            if (showPreview) {
                                hasAttemptedFetchRef.current = false;
                            }
                            setShowPreview(!showPreview);
                        }}
                        disabled={loading}
                    >
                        {showPreview ? 'Hide' : 'View'}
                    </button>
                ) : isTextFile(fileName) ? (
                    <button
                        style={buttonStyle}
                        onClick={handleOpenFile}
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : (showPreview ? 'Close' : 'Open')}
                    </button>
                ) : (
                    <a
                        href={getAuthenticatedUrl(fileUrl)}
                        download={fileName}
                        style={{ ...buttonStyle, textDecoration: 'none' }}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Download
                    </a>
                )}
            </div>

            {/* Preview section */}
            {showPreview && (
                <div>
                    {isImageFile(fileType) && !imageError && !loading && imageBlob && (
                        <div style={{ padding: '8px', textAlign: 'center' }}>
                            <img
                                src={imageBlob}
                                alt={fileName}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '300px',
                                    objectFit: 'contain'
                                }}
                            />
                        </div>
                    )}

                    {isImageFile(fileType) && loading && (
                        <div style={{ ...textPreviewStyle, textAlign: 'center' }}>
                            Loading image...
                        </div>
                    )}

                    {isImageFile(fileType) && imageError && (
                        <div style={errorContainerStyle}>
                            <div style={{ marginBottom: '10px' }}>Failed to load image</div>
                            <button
                                style={{ ...buttonStyle, marginRight: '10px' }}
                                onClick={handleRetry}
                            >
                                Try Again
                            </button>
                            <a
                                href={getAuthenticatedUrl(fileUrl)}
                                download={fileName}
                                style={{ ...buttonStyle, textDecoration: 'none' }}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Download Instead
                            </a>
                        </div>
                    )}

                    {isTextFile(fileName) && textContent && (
                        <div style={textPreviewStyle}>{textContent}</div>
                    )}

                    {isTextFile(fileName) && loading && (
                        <div style={{ ...textPreviewStyle, textAlign: 'center' }}>
                            Loading content...
                        </div>
                    )}

                    {/* Debug information for images */}
                    {isImageFile(fileType) && debugInfo && (
                        <div style={debugContainerStyle}>
                            <strong>Debug Info:</strong> {debugInfo}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FileAttachment;
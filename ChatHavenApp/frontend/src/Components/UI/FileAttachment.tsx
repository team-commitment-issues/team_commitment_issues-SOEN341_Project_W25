// Components/UI/FileAttachment.tsx
import React, { useState } from 'react';
import { useTheme } from '../../Context/ThemeContext.tsx';

interface FileAttachmentProps {
    fileName: string;
    fileType: string;
    fileUrl: string;
    fileSize?: number;
}

// List of text-based file extensions that can be displayed
const TEXT_FILE_EXTENSIONS = [
    '.txt', '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.json', '.md',
    '.csv', '.xml', '.yml', '.yaml', '.sh', '.bash', '.py', '.java', '.c',
    '.cpp', '.h', '.cs', '.php', '.rb', '.go', '.rust', '.swift'
];

// Check if a file type is an image
const isImageFile = (fileType: string): boolean => {
    return fileType.startsWith('image/');
};

// Check if a file can be displayed as text
const isTextFile = (fileName: string): boolean => {
    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    return TEXT_FILE_EXTENSIONS.includes(extension);
};

// Format file size for display
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

    // Add token to fileUrl
    const getAuthenticatedUrl = (url: string, inline: boolean = false): string => {
        const token = localStorage.getItem('token');
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}token=${token}${inline ? '&inline=true' : ''}`;
    };

    // Handle file opening/preview
    const handleOpenFile = async () => {
        // If it's a text file and we don't have content yet, fetch it
        if (isTextFile(fileName) && !textContent) {
            try {
                setLoading(true);
                const response = await fetch(getAuthenticatedUrl(fileUrl, true), {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch file: ${response.statusText}`);
                }

                const content = await response.text();
                setTextContent(content);
                setShowPreview(true);
            } catch (error) {
                console.error('Error fetching file:', error);
                alert('Failed to load file content');
            } finally {
                setLoading(false);
            }
        } else {
            // Toggle preview for text files
            setShowPreview(!showPreview);
        }
    };

    // Base styles for the component
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

    // Different file type icons
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

    // Render different content based on file type
    return (
        <div style={containerStyle}>
            <div style={fileInfoStyle}>
                <div style={fileIconStyle}>{getFileIcon()}</div>
                <div style={fileNameStyle}>{fileName}</div>
                {fileSize && <div style={fileSizeStyle}>{formatFileSize(fileSize)}</div>}

                {isImageFile(fileType) ? (
                    // For images, provide view button
                    <button
                        style={buttonStyle}
                        onClick={() => setShowPreview(!showPreview)}
                    >
                        {showPreview ? 'Hide' : 'View'}
                    </button>
                ) : isTextFile(fileName) ? (
                    // For text-based files, provide open button
                    <button
                        style={buttonStyle}
                        onClick={handleOpenFile}
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : (showPreview ? 'Close' : 'Open')}
                    </button>
                ) : (
                    // For other files, provide download button
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
                    {isImageFile(fileType) && (
                        <div style={{ padding: '8px', textAlign: 'center' }}>
                            <img
                                src={getAuthenticatedUrl(fileUrl, true)}
                                alt={fileName}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '300px',
                                    objectFit: 'contain'
                                }}
                            />
                        </div>
                    )}

                    {isTextFile(fileName) && textContent && (
                        <div style={textPreviewStyle}>{textContent}</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FileAttachment;
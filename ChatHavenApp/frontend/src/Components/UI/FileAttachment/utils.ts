// Components/UI/FileAttachment/utils.ts

export const TEXT_FILE_EXTENSIONS = [
    '.txt', '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.json', '.md',
    '.csv', '.xml', '.yml', '.yaml', '.sh', '.bash', '.py', '.java', '.c',
    '.cpp', '.h', '.cs', '.php', '.rb', '.go', '.rust', '.swift'
];

/**
 * Checks if a file is an image based on its MIME type
 */
export const isImageFile = (fileType: string): boolean => {
    return fileType.startsWith('image/');
};

/**
 * Checks if a file is a text file based on its extension
 */
export const isTextFile = (fileName: string): boolean => {
    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    return TEXT_FILE_EXTENSIONS.includes(extension);
};

/**
 * Formats file size into a human-readable string
 */
export const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';

    if (bytes < 1024) {
        return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
};

/**
 * Gets a file icon based on file type
 */
export const getFileIcon = (fileType: string, fileName: string): string => {
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

/**
 * Creates an authenticated URL for file access
 */
export const getAuthenticatedUrl = (url: string, fileVersion: number, inline: boolean = false): string => {
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
    // Add version to force cache refresh after edits
    const authenticatedUrl = `${normalizedUrl}${separator}token=${token}${inline ? '&inline=true' : ''}&v=${fileVersion}`;

    return authenticatedUrl;
};
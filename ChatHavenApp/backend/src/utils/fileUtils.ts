// utils/fileUtils.ts
import * as path from 'path';
import * as fs from 'fs';
import * as mime from 'mime-types';

/**
 * Gets a MIME type based on file extension or falls back to provided type
 */
export const getAccurateMimeType = (fileName: string, providedType?: string): string => {
    // First try to get MIME type from file extension
    const mimeType = mime.lookup(fileName);

    if (mimeType) {
        return mimeType;
    }

    // Fall back to provided type if available
    if (providedType && providedType !== 'application/octet-stream') {
        return providedType;
    }

    // Default generic binary type
    return 'application/octet-stream';
};

/**
 * Check if a file is an image based on MIME type
 */
export const isImageFile = (mimeType: string): boolean => {
    return mimeType.startsWith('image/');
};

/**
 * Check if a file is a text file that can be displayed
 */
export const isTextFile = (mimeType: string, fileName: string): boolean => {
    // Common text MIME types
    const textMimeTypes = [
        'text/plain',
        'text/html',
        'text/css',
        'text/javascript',
        'application/json',
        'application/xml',
        'text/markdown',
        'text/csv'
    ];

    // Check MIME type first
    if (textMimeTypes.some(type => mimeType.startsWith(type))) {
        return true;
    }

    // Additional check based on extension for common code files
    const extension = path.extname(fileName).toLowerCase();
    const codeExtensions = [
        '.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.php',
        '.java', '.c', '.cpp', '.h', '.cs', '.go', '.rust',
        '.swift', '.sh', '.bash', '.sql', '.yaml', '.yml'
    ];

    return codeExtensions.includes(extension);
};

/**
 * Get appropriate headers for a file
 */
export const getFileHeaders = (filePath: string, inline: boolean = false): Record<string, string> => {
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = getAccurateMimeType(fileName);

    const headers: Record<string, string> = {
        'Content-Type': mimeType
    };

    // Set appropriate content disposition
    if (inline) {
        headers['Content-Disposition'] = `inline; filename="${fileName}"`;
    } else {
        headers['Content-Disposition'] = `attachment; filename="${fileName}"`;
    }

    return headers;
};

/**
 * Read a small portion of a file to determine if it's a text file
 * This is useful when mime-type detection isn't conclusive
 */
export const isLikelyTextFile = async (filePath: string): Promise<boolean> => {
    try {
        // Read first 1000 bytes of the file
        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(1000);
        const bytesRead = fs.readSync(fd, buffer, 0, 1000, 0);
        fs.closeSync(fd);

        // Check for null bytes which indicate binary content
        for (let i = 0; i < bytesRead; i++) {
            if (buffer[i] === 0) {
                return false;
            }
        }

        return true;
    } catch (error) {
        return false;
    }
};
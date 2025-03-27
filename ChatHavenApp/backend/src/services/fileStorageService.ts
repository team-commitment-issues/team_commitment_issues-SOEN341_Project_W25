// services/fileStorageService.ts
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { promisify } from 'util';
import { createLogger } from '../utils/logger';

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);

const logger = createLogger('FileStorageService');

class FileStorageService {
    private uploadDir: string;

    constructor() {
        // Set the upload directory - can be configured via env variables
        this.uploadDir = process.env.FILE_UPLOAD_DIR || path.join(process.cwd(), 'uploads');
        this.ensureUploadDirExists();
    }

    /**
     * Ensures the upload directory exists
     */
    private async ensureUploadDirExists(): Promise<void> {
        try {
            const exists = await existsAsync(this.uploadDir);
            if (!exists) {
                await mkdirAsync(this.uploadDir, { recursive: true });
                logger.info(`Created upload directory: ${this.uploadDir}`);
            }
        } catch (error) {
            logger.error('Failed to create upload directory', { error });
            throw new Error('Failed to initialize file storage service');
        }
    }

    /**
     * Saves a file from base64 data
     * @param base64Data Base64 encoded file data
     * @param fileName Original file name
     * @param fileType MIME type of the file
     * @returns The URL or path to access the file
     */
    public async saveFile(base64Data: string, fileName: string, fileType: string): Promise<string> {
        try {
            // Remove the data:image/jpeg;base64, part if present
            const base64Content = base64Data.includes(',')
                ? base64Data.split(',')[1]
                : base64Data;

            // Clean the filename (remove any potentially unsafe characters)
            const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

            // Extract file extension and ensure it exists
            let fileExt = path.extname(cleanFileName);
            if (!fileExt) {
                // Try to determine extension from MIME type if file has no extension
                const mimeExtension = require('mime-types').extension(fileType);
                if (mimeExtension) {
                    fileExt = `.${mimeExtension}`;
                } else {
                    // Default extension based on content type
                    if (fileType.startsWith('image/')) {
                        fileExt = '.jpg';
                    } else if (fileType.startsWith('text/')) {
                        fileExt = '.txt';
                    } else {
                        fileExt = '.bin';
                    }
                }
            }

            const fileNameWithoutExt = path.basename(cleanFileName, fileExt);

            // Current date for organizing files
            const now = new Date();
            const year = now.getFullYear().toString();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');

            // Generate unique ID for the file
            const timestamp = Date.now();
            const randomString = crypto.randomBytes(4).toString('hex');
            const safeFileName = `${fileNameWithoutExt}_${timestamp}_${randomString}${fileExt}`;

            // Create path with year/month/day organization
            const relativePath = path.join(
                year,
                month,
                day,
                safeFileName
            );

            const fullPath = path.join(this.uploadDir, relativePath);
            const dirPath = path.dirname(fullPath);

            // Create directory if it doesn't exist
            if (!await existsAsync(dirPath)) {
                await mkdirAsync(dirPath, { recursive: true });
            }

            // Write the file
            const buffer = Buffer.from(base64Content, 'base64');
            await writeFileAsync(fullPath, buffer);

            const fileSize = buffer.length;
            logger.info('File saved successfully', {
                fileName: cleanFileName,
                path: relativePath,
                size: fileSize,
                type: fileType
            });

            // Return the relative path that can be used to access the file
            return relativePath;
        } catch (error) {
            logger.error('Failed to save file', {
                fileName,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to save file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Gets the full path to a file
     * @param relativePath The relative path of the file
     * @returns The full path to the file
     */
    public getFilePath(relativePath: string): string {
        return path.join(this.uploadDir, relativePath);
    }

    /**
     * Gets the URL to access a file
     * @param relativePath The relative path of the file
     * @returns The URL to access the file
     */
    public getFileUrl(relativePath: string): string {
        // This should match your API endpoint for retrieving files
        // For example: /files/your-file-path
        return `/files/${relativePath}`;
    }
}

export default new FileStorageService();
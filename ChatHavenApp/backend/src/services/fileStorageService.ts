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

            // Clean the filename (remove path traversal characters and make it safe)
            const cleanFileName = path.basename(fileName).replace(/[^\w.-]/g, '_');

            // Generate a unique filename to prevent collisions
            const timestamp = Date.now();
            const randomString = crypto.randomBytes(8).toString('hex');
            const safeFileName = `${timestamp}_${randomString}_${cleanFileName}`;

            // Create full path for the file
            const fullPath = path.join(this.uploadDir, safeFileName);

            // Write the file
            const buffer = Buffer.from(base64Content, 'base64');
            await writeFileAsync(fullPath, buffer);

            logger.info('File saved successfully', {
                originalName: fileName,
                savedAs: safeFileName,
                size: buffer.length,
                type: fileType,
                path: fullPath
            });

            // Return the relative path (just the filename in this case)
            return safeFileName;
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
        // Clean the path to prevent directory traversal attacks
        const cleanPath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
        return path.join(this.uploadDir, cleanPath);
    }

    /**
     * Gets the URL to access a file
     * @param relativePath The relative path of the file
     * @returns The URL to access the file
     */
    public getFileUrl(relativePath: string): string {
        // Clean the path to prevent URL manipulation
        const cleanPath = encodeURIComponent(relativePath);
        return `/files/${cleanPath}`;
    }
}

export default new FileStorageService();
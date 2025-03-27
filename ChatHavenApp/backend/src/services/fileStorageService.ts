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

            // Generate a unique filename to prevent collisions
            const fileExt = path.extname(fileName);
            const fileNameWithoutExt = path.basename(fileName, fileExt);
            const timestamp = Date.now();
            const randomString = crypto.randomBytes(8).toString('hex');
            const safeFileName = `${fileNameWithoutExt}_${timestamp}_${randomString}${fileExt}`;

            // Create path and ensure directories exist
            const relativePath = path.join(
                safeFileName.substring(0, 2), // Use first 2 chars for sharding
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

            logger.info('File saved successfully', { fileName, path: relativePath });

            // Return the relative path that can be used to access the file
            return relativePath;
        } catch (error: any) {
            logger.error('Failed to save file', { fileName, error });
            throw new Error(`Failed to save file: ${error.message}`);
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
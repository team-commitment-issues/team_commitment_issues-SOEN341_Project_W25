// services/fileEditingService.ts
import * as fs from 'fs';
import { createLogger } from '../utils/logger';
import fileStorageService from './fileStorageService';
import { Message, IMessage } from '../models/Message';
import DMessage, { IDMessage } from '../models/DMessage';
import { Types } from 'mongoose';
import path from 'path';
import { promisify } from 'util';
import * as crypto from 'crypto';

const logger = createLogger('FileEditingService');
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);

interface EditLock {
    messageId: string;
    fileName: string;
    username: string;
    acquiredAt: Date;
    teamName?: string;
    channelName?: string;
    filePath?: string;
}

/**
 * Service for managing file editing locks and content updates
 */
class FileEditingService {
    private activeLocks: Map<string, EditLock>;
    private lockTimeout: number; // Timeout in milliseconds (e.g., 5 minutes)
    private lockCleanupInterval: NodeJS.Timeout | null;

    constructor(lockTimeoutMs: number = 5 * 60 * 1000) {
        this.activeLocks = new Map();
        this.lockTimeout = lockTimeoutMs;
        this.lockCleanupInterval = null;
        this.startLockCleanup();
    }

    /**
     * Start a timer to clean up expired locks
     */
    private startLockCleanup(): void {
        // Run cleanup every minute
        this.lockCleanupInterval = setInterval(() => {
            const now = new Date();
            const expiredLocks: string[] = [];

            this.activeLocks.forEach((lock, key) => {
                // Check if lock has expired
                const lockAge = now.getTime() - lock.acquiredAt.getTime();
                if (lockAge > this.lockTimeout) {
                    expiredLocks.push(key);
                }
            });

            // Remove expired locks
            expiredLocks.forEach(key => {
                const lock = this.activeLocks.get(key);
                if (lock) {
                    this.releaseLock(lock.messageId, lock.username);
                    logger.info(`Auto-released expired lock for file in message ${lock.messageId}`, {
                        username: lock.username,
                        fileName: lock.fileName,
                        messageId: lock.messageId,
                        expiredAfter: this.lockTimeout
                    });
                }
            });
        }, 60000);
    }

    /**
     * Stop the cleanup timer
     */
    public stopLockCleanup(): void {
        if (this.lockCleanupInterval) {
            clearInterval(this.lockCleanupInterval);
            this.lockCleanupInterval = null;
        }
    }

    /**
     * Get lock key for a message
     */
    private getLockKey(messageId: string): string {
        return `file_lock:${messageId}`;
    }

    /**
     * Request a lock for editing a file
     */
    public async requestLock(
        messageId: string,
        fileName: string,
        username: string,
        teamName?: string,
        channelName?: string
    ): Promise<{
        granted: boolean;
        lockedBy?: string;
        lockedAt?: Date;
        filePath?: string;
    }> {
        const lockKey = this.getLockKey(messageId);
        const existingLock = this.activeLocks.get(lockKey);

        // If lock exists and is not expired, deny the request
        if (existingLock) {
            // Allow the same user to refresh their lock
            if (existingLock.username === username) {
                existingLock.acquiredAt = new Date(); // Refresh lock time
                return { granted: true, filePath: existingLock.filePath };
            }

            return {
                granted: false,
                lockedBy: existingLock.username,
                lockedAt: existingLock.acquiredAt
            };
        }

        // Find the message to verify it exists and get the file path
        let fileInfo;
        try {
            // Check if it's a channel message
            const channelMessage = await Message.findById(messageId);
            if (channelMessage && channelMessage.fileName && channelMessage.fileUrl) {
                fileInfo = {
                    fileName: channelMessage.fileName,
                    fileUrl: channelMessage.fileUrl
                };
            } else {
                // Check if it's a direct message
                const directMessage = await DMessage.findById(messageId);
                if (directMessage && directMessage.fileName && directMessage.fileUrl) {
                    fileInfo = {
                        fileName: directMessage.fileName,
                        fileUrl: directMessage.fileUrl
                    };
                } else {
                    throw new Error(`Message ${messageId} not found or doesn't contain a file`);
                }
            }
        } catch (error) {
            logger.error('Error finding message during lock request', {
                messageId,
                fileName,
                username,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }

        // Get the file path from the URL
        const fileUrl = fileInfo.fileUrl;
        const relativePath = fileUrl.startsWith('/files/') ? fileUrl.substring(7) : fileUrl;
        const filePath = fileStorageService.getFilePath(relativePath);

        // Check if the file exists
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${fileName}`);
        }

        // Grant the lock
        const lock: EditLock = {
            messageId,
            fileName,
            username,
            acquiredAt: new Date(),
            teamName,
            channelName,
            filePath
        };

        this.activeLocks.set(lockKey, lock);
        return { granted: true, filePath };
    }

    /**
     * Release a lock
     */
    public releaseLock(messageId: string, username: string): boolean {
        const lockKey = this.getLockKey(messageId);
        const existingLock = this.activeLocks.get(lockKey);

        if (!existingLock) {
            return true;
        }

        // Only the lock owner can release it
        if (existingLock.username === username) {
            this.activeLocks.delete(lockKey);
            return true;
        }

        return false;
    }

    /**
     * Check if a file is locked
     */
    public isLocked(messageId: string): {
        locked: boolean;
        username?: string;
        acquiredAt?: Date;
    } {
        const lockKey = this.getLockKey(messageId);
        const existingLock = this.activeLocks.get(lockKey);

        if (existingLock) {
            return {
                locked: true,
                username: existingLock.username,
                acquiredAt: existingLock.acquiredAt
            };
        }

        return { locked: false };
    }

    /**
     * Get all active locks
     */
    public getActiveLocks(): EditLock[] {
        return Array.from(this.activeLocks.values());
    }

    /**
     * Force release a lock (admin function)
     */
    public forceReleaseLock(messageId: string): boolean {
        const lockKey = this.getLockKey(messageId);
        if (this.activeLocks.has(lockKey)) {
            this.activeLocks.delete(lockKey);
            return true;
        }
        return false;
    }

    /**
     * Update file content
     */
    public async updateFileContent(
        messageId: string,
        username: string,
        content: string,
        description?: string
    ): Promise<{ success: boolean; fileName: string }> {
        const lockKey = this.getLockKey(messageId);
        const existingLock = this.activeLocks.get(lockKey);

        // Check if user has the lock
        if (!existingLock || existingLock.username !== username) {
            throw new Error('You do not have an active edit lock for this file');
        }

        const { filePath, fileName } = existingLock;

        if (!filePath) {
            throw new Error('File path not found in lock information');
        }

        try {
            // Generate a simple content hash to detect significant changes
            const contentHash = crypto
                .createHash('md5')
                .update(content)
                .digest('hex');

            // Current file size
            const fileSize = content.length;

            // Create history entry
            const historyEntry = {
                username,
                timestamp: new Date(),
                description: description || 'Updated file content',
                contentHash,
                fileSize
            };

            // Write the updated content to the file
            await writeFileAsync(filePath, content, 'utf8');

            // Update the message to indicate it's been edited
            let updated = false;
            let updatedMessage: IMessage | IDMessage | null = null;

            // Check if it's a channel message
            const channelMessage = await Message.findById(messageId);
            if (channelMessage) {
                // Update the single edit reference (backward compatibility)
                channelMessage.editedBy = username;
                channelMessage.editedAt = new Date();

                // Add to edit history
                if (!channelMessage.editHistory) {
                    channelMessage.editHistory = [];
                }
                channelMessage.editHistory.push(historyEntry);

                updatedMessage = await channelMessage.save();
                updated = true;

                logger.info('Updated channel message after file edit', {
                    messageId,
                    username,
                    fileName,
                    historyLength: channelMessage.editHistory.length
                });
            } else {
                // Check if it's a direct message
                const directMessage = await DMessage.findById(messageId);
                if (directMessage) {
                    // Update the single edit reference (backward compatibility)
                    directMessage.editedBy = username;
                    directMessage.editedAt = new Date();

                    // Add to edit history
                    if (!directMessage.editHistory) {
                        directMessage.editHistory = [];
                    }
                    directMessage.editHistory.push(historyEntry);

                    updatedMessage = await directMessage.save();
                    updated = true;

                    logger.info('Updated direct message after file edit', {
                        messageId,
                        username,
                        fileName,
                        historyLength: directMessage.editHistory.length
                    });
                }
            }

            if (!updated) {
                throw new Error(`Message ${messageId} not found`);
            }

            // Release the lock
            this.releaseLock(messageId, username);

            return {
                success: true,
                fileName
            };
        } catch (error) {
            logger.error('Error updating file content', {
                messageId,
                username,
                fileName,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    /**
     * Get file content
     */
    public async getFileContent(messageId: string): Promise<{ content: string; fileName: string }> {
        // Find the message to get the file info
        let fileInfo;
        try {
            // Check if it's a channel message
            const channelMessage = await Message.findById(messageId);
            if (channelMessage && channelMessage.fileName && channelMessage.fileUrl) {
                fileInfo = {
                    fileName: channelMessage.fileName,
                    fileUrl: channelMessage.fileUrl
                };
            } else {
                // Check if it's a direct message
                const directMessage = await DMessage.findById(messageId);
                if (directMessage && directMessage.fileName && directMessage.fileUrl) {
                    fileInfo = {
                        fileName: directMessage.fileName,
                        fileUrl: directMessage.fileUrl
                    };
                } else {
                    throw new Error(`Message ${messageId} not found or doesn't contain a file`);
                }
            }
        } catch (error) {
            logger.error('Error finding message when getting file content', {
                messageId,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }

        // Get the file path from the URL
        const fileUrl = fileInfo.fileUrl;
        const relativePath = fileUrl.startsWith('/files/') ? fileUrl.substring(7) : fileUrl;
        const filePath = fileStorageService.getFilePath(relativePath);

        // Check if the file exists
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${fileInfo.fileName}`);
        }

        try {
            // Read the file content
            const content = await readFileAsync(filePath, 'utf8');
            return {
                content,
                fileName: fileInfo.fileName
            };
        } catch (error) {
            logger.error('Error reading file content', {
                messageId,
                fileName: fileInfo.fileName,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
}

// Export a singleton instance
export default new FileEditingService();
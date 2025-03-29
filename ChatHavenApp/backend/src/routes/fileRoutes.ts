// routes/fileRoutes.ts
import express from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { createLogger } from '../utils/logger';
import mime from 'mime';
import FileStorageService from '../services/fileStorageService';
import authenticate from '../middlewares/authMiddleware';
import { checkUserPermission, checkTeamPermission } from '../middlewares/permissionMiddleware';
import fileEditingService from '../services/fileEditingService';
import { Role, TeamRole } from '../enums';

const fileRoutes = express.Router();
const logger = createLogger('FileRoutes');

/**
 * File download endpoint
 * GET /files/:filePath
 */
fileRoutes.get('/:filePath(*)', authenticate, (req, res): void => {
    // Get the file path from the URL
    const relativePath = req.params.filePath;

    // Log the requested path for debugging
    logger.debug('File request received', {
        requestedPath: relativePath,
        params: req.params,
        query: req.query,
        user: req.user ? req.user.username : 'unknown'
    });

    const fullPath = FileStorageService.getFilePath(relativePath);

    // Check if the file exists
    if (!fs.existsSync(fullPath)) {
        logger.error('File not found', {
            requestedPath: relativePath,
            fullPath: fullPath
        });
        res.status(404).json({ error: 'File not found' });
        return;
    }

    try {
        // Get filename and determine if viewing inline
        const fileName = path.basename(fullPath);
        const inline = req.query.inline === 'true';

        // Get the file extension and use utils to determine content type
        const ext = path.extname(fullPath).toLowerCase();
        const contentType = getAccurateMimeType(fileName);

        // Improve content types for common text files
        const contentTypeMap = {
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.csv': 'text/csv',
            '.json': 'application/json',
            '.js': 'text/javascript',
            '.jsx': 'text/javascript',
            '.ts': 'text/plain',
            '.tsx': 'text/plain',
            '.html': 'text/html',
            '.css': 'text/css'
        };

        // Set appropriate content type with explicit charset for text files
        const finalContentType = contentTypeMap[ext] || contentType;
        if (finalContentType.startsWith('text/')) {
            res.setHeader('Content-Type', `${finalContentType}; charset=utf-8`);
        } else {
            res.setHeader('Content-Type', finalContentType);
        }

        // Set content disposition based on inline flag
        if (inline) {
            res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        } else {
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        }

        // Add cache control headers to prevent caching of sensitive files
        res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Add CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

        // Stream the file to the response
        const fileStream = fs.createReadStream(fullPath);
        fileStream.on('error', (error) => {
            logger.error('Error streaming file', {
                path: relativePath,
                error: error instanceof Error ? error.message : String(error)
            });
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to stream file' });
            } else {
                res.end();
            }
        });

        // Pipe the file to the response
        fileStream.pipe(res);

        logger.debug('File served successfully', {
            path: relativePath,
            contentType: finalContentType,
            user: req.user ? req.user.username : 'unknown'
        });
    } catch (error) {
        if (!res.headersSent) {
            logger.error('Error serving file', {
                path: relativePath,
                error: error instanceof Error ? error.message : String(error)
            });
            res.status(500).json({ error: 'Failed to serve file' });
        } else {
            logger.error('Error after headers sent', {
                path: relativePath,
                error: error instanceof Error ? error.message : String(error)
            });
            res.end();
        }
    }
});

/**
 * Get lock status for a file
 * GET /api/file-edit/lock-status/:messageId
 */
fileRoutes.get('/lock-status/:messageId', authenticate, async (req, res) => {
    try {
        const { messageId } = req.params;
        const status = fileEditingService.isLocked(messageId);

        res.json({
            success: true,
            ...status
        });
        return;
    } catch (error) {
        logger.error('Error checking lock status', {
            messageId: req.params.messageId,
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({
            success: false,
            error: 'Failed to get lock status'
        });
        return;
    }
});

/**
 * Get file content
 * GET /api/file-edit/content/:messageId
 */
fileRoutes.get('/content/:messageId', authenticate, async (req, res) => {
    try {
        const { messageId } = req.params;
        const result = await fileEditingService.getFileContent(messageId);

        res.json({
            success: true,
            content: result.content,
            fileName: result.fileName
        });
        return;
    } catch (error) {
        logger.error('Error getting file content', {
            messageId: req.params.messageId,
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({
            success: false,
            error: 'Failed to get file content'
        });
        return;
    }
});

/**
 * Force release a lock (admin only)
 * POST /api/file-edit/force-release/:messageId
 */
fileRoutes.post('/force-release/:messageId', authenticate, checkUserPermission(Role.SUPER_ADMIN), checkTeamPermission(TeamRole.ADMIN), async (req, res) => {
    try {
        const { messageId } = req.params;
        const released = fileEditingService.forceReleaseLock(messageId);

        if (released) {
            logger.info('Lock forcefully released by admin', {
                messageId,
                admin: req.user.username
            });
            res.json({
                success: true,
                message: 'Lock released successfully'
            });
            return;
        } else {
            res.status(404).json({
                success: false,
                error: 'No active lock found for this message'
            });
            return;
        }
    } catch (error) {
        logger.error('Error force releasing lock', {
            messageId: req.params.messageId,
            admin: req.user?.username,
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({
            success: false,
            error: 'Failed to force release lock'
        });
        return;
    }
});

/**
 * Get all active locks (admin only)
 * GET /api/file-edit/active-locks
 */
fileRoutes.get('/active-locks', authenticate, checkUserPermission(Role.SUPER_ADMIN), checkTeamPermission(TeamRole.ADMIN), async (req, res) => {
    try {
        const locks = fileEditingService.getActiveLocks();
        res.json({
            success: true,
            locks: locks.map(lock => ({
                messageId: lock.messageId,
                fileName: lock.fileName,
                username: lock.username,
                acquiredAt: lock.acquiredAt,
                teamName: lock.teamName,
                channelName: lock.channelName
            }))
        });
        return;
    } catch (error) {
        logger.error('Error getting active locks', {
            admin: req.user?.username,
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({
            success: false,
            error: 'Failed to get active locks'
        });
        return;
    }
});

export default fileRoutes;

function getAccurateMimeType(fileName: string) {
    return mime.lookup(fileName) || 'application/octet-stream';
}

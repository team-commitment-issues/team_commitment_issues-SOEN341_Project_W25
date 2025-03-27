// routes/fileRoutes.ts
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createLogger } from '../utils/logger';
import FileStorageService from '../services/fileStorageService';
import authenticate from '../middlewares/authMiddleware';

const fileRoutes = express.Router();
const logger = createLogger('FileRoutes');

/**
 * File download endpoint
 * GET /files/:filePath
 */
fileRoutes.get('/:filePath(*)', authenticate, (req, res): void => {
    // Get the file path from the URL
    const relativePath = req.params.filePath;
    const fullPath = FileStorageService.getFilePath(relativePath);

    // Check if the file exists BEFORE doing anything else
    if (!fs.existsSync(fullPath)) {
        logger.error('File not found', { path: relativePath });
        res.status(404).json({ error: 'File not found' });
        return;
    }

    try {
        // Get filename and determine if viewing inline
        const fileName = path.basename(fullPath);
        const inline = req.query.inline === 'true';

        // Get the file extension
        const ext = path.extname(fullPath).toLowerCase();

        // Set appropriate content type
        const contentTypeMap: { [key: string]: string } = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.txt': 'text/plain',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.html': 'text/html',
            '.json': 'application/json',
            '.xml': 'application/xml',
            '.csv': 'text/csv'
        };

        const contentType = contentTypeMap[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);

        // Set content disposition based on inline flag and file type
        if (inline || ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif') {
            res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        } else {
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        }

        // Set CORS headers to allow embedding in the app
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

        // Stream the file to the response
        const fileStream = fs.createReadStream(fullPath);

        // Error handling for the file stream
        fileStream.on('error', (error) => {
            logger.error('Error streaming file', {
                path: relativePath,
                error: error instanceof Error ? error.message : String(error)
            });

            // Only attempt to send an error if headers haven't been sent yet
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to stream file' }).end();
            } else {
                // If headers are already sent, just end the response
                res.end();
            }
        });

        // Pipe the file to the response
        fileStream.pipe(res);

        logger.debug('File served successfully', {
            path: relativePath,
            contentType
        });
    } catch (error) {
        // Only attempt to send an error if headers haven't been sent yet
        if (!res.headersSent) {
            logger.error('Error serving file', {
                path: relativePath,
                error: error instanceof Error ? error.message : String(error)
            });
            res.status(500).json({ error: 'Failed to serve file' }).end();
        } else {
            // If headers are already sent, just log the error and end the response
            logger.error('Error after headers sent', {
                path: relativePath,
                error: error instanceof Error ? error.message : String(error)
            });
            res.end();
        }
    }
});

export default fileRoutes;
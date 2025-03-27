// routes/fileRoutes.ts
import express from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { createLogger } from '../utils/logger';
import FileStorageService from '../services/fileStorageService';
import authenticate from '../middlewares/authMiddleware';

const fileRoutes = express.Router();
const logger = createLogger('FileRoutes');

/**
 * File download endpoint
 * GET /files/:filePath
 */
fileRoutes.get('/:filePath(*)', authenticate, (req, res) => {
    try {
        // Get the file path from the URL
        const relativePath = req.params.filePath;
        const fullPath = FileStorageService.getFilePath(relativePath);

        // Check if the file exists
        if (!fs.existsSync(fullPath)) {
            logger.error('File not found', { path: relativePath });
            res.status(404).json({ error: 'File not found' });
            return;
        }

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
            '.txt': 'text/plain'
        };

        const contentType = contentTypeMap[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);

        // Set content disposition (for downloads)
        const fileName = path.basename(fullPath);
        if (!req.query.inline) {
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        }

        // Stream the file to the response
        const fileStream = fs.createReadStream(fullPath);
        fileStream.pipe(res);

        logger.debug('File served successfully', { path: relativePath });
    } catch (error) {
        logger.error('Error serving file', {
            path: req.params.filePath,
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({ error: 'Failed to serve file' });
        return;
    }
});

export default fileRoutes;
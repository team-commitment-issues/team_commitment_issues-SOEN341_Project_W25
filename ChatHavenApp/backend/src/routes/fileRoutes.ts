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
fileRoutes.get('/:filePath(*)', authenticate, async (req, res) => {
    try {
        // Get the file path from the URL
        const relativePath = req.params.filePath;
        const fullPath = FileStorageService.getFilePath(relativePath);

        // Check if the file exists
        if (!fs.existsSync(fullPath)) {
            logger.error('File not found', { path: relativePath });
            res.status(404).json({ error: 'File not found' });
        }

        // Get filename and determine if viewing inline
        const fileName = path.basename(fullPath);
        const inline = req.query.inline === 'true';

        // Import file utils
        const {
            getAccurateMimeType,
            isImageFile,
            isTextFile,
            isLikelyTextFile
        } = require('../utils/fileUtils');

        // Get the MIME type
        const mimeType = getAccurateMimeType(fileName);
        res.setHeader('Content-Type', mimeType);

        // Determine if this should be displayed inline
        let shouldBeInline = inline;

        // Automatically display images inline
        if (isImageFile(mimeType)) {
            shouldBeInline = true;
        }

        // For text files requested with inline=true, verify they're actually text
        if (inline && !isImageFile(mimeType)) {
            const isText = isTextFile(mimeType, fileName) || await isLikelyTextFile(fullPath);
            shouldBeInline = isText;
        }

        // Set content disposition based on inlineView flag
        if (shouldBeInline) {
            res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        } else {
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        }

        // Set CORS headers to allow embedding in the app
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

        // Stream the file to the response
        const fileStream = fs.createReadStream(fullPath);
        fileStream.pipe(res);

        logger.debug('File served successfully', {
            path: relativePath,
            mimeType,
            disposition: shouldBeInline ? 'inline' : 'attachment'
        });
    } catch (error) {
        logger.error('Error serving file', {
            path: req.params.filePath,
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({ error: 'Failed to serve file' });
    }
});

export default fileRoutes;
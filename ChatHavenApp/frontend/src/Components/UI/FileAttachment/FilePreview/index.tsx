// Components/UI/FileAttachment/FilePreview/index.tsx
import React from 'react';
import ImagePreview from './ImagePreview.tsx';
import TextPreview from './TextPreview.tsx';
import { isImageFile, isTextFile, getAuthenticatedUrl } from '../utils.ts';
import { useTheme } from '../../../../Context/ThemeContext.tsx';

interface FilePreviewProps {
    fileName: string;
    fileType: string;
    fileUrl: string;
    fileVersion: number;
    textContent: string | null;
    loading: boolean;
}

const FilePreview: React.FC<FilePreviewProps> = ({
    fileName,
    fileType,
    fileUrl,
    fileVersion,
    textContent,
    loading
}) => {
    const { theme } = useTheme();

    // Handle unsupported file types
    if (!isImageFile(fileType) && !isTextFile(fileName)) {
        return (
            <div className={`unsupported-preview ${theme}`}>
                <p>Preview not available for this file type.</p>
                <a
                    href={getAuthenticatedUrl(fileUrl, fileVersion)}
                    className={`file-button file-download-link ${theme}`}
                    download={fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Download File
                </a>
            </div>
        );
    }

    // Handle image files
    if (isImageFile(fileType)) {
        return (
            <div className={`file-preview-wrapper ${theme}`}>
                <ImagePreview
                    fileName={fileName}
                    fileUrl={fileUrl}
                    fileVersion={fileVersion}
                />
            </div>
        );
    }

    // Handle text files
    if (isTextFile(fileName)) {
        return (
            <div className={`file-preview-wrapper ${theme}`}>
                <TextPreview
                    content={textContent}
                    loading={loading}
                />
            </div>
        );
    }

    return null;
};

export default FilePreview;
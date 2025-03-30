// Components/UI/FileAttachment/FilePreview/index.tsx
import React from 'react';
import ImagePreview from './ImagePreview.tsx';
import TextPreview from './TextPreview.tsx';
import { isImageFile, isTextFile } from '../utils.ts';

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
    if (isImageFile(fileType)) {
        return (
            <ImagePreview
                fileName={fileName}
                fileUrl={fileUrl}
                fileVersion={fileVersion}
            />
        );
    }

    if (isTextFile(fileName)) {
        return (
            <TextPreview
                content={textContent}
                loading={loading}
            />
        );
    }

    return null;
};

export default FilePreview;
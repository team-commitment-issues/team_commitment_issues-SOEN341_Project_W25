// Components/UI/FileAttachment/UploadStatusIndicator.tsx
import React from 'react';
import { useTheme } from '../../../Context/ThemeContext.tsx';

type UploadStatus = 'pending' | 'completed' | 'error';

interface UploadStatusIndicatorProps {
    status: UploadStatus;
}

const UploadStatusIndicator: React.FC<UploadStatusIndicatorProps> = ({ status }) => {
    const { theme } = useTheme();

    if (status === 'completed') return null;

    if (status === 'pending') {
        return (
            <div className={`upload-status status-pending ${theme}`}>
                <span>Uploading... Please wait</span>
            </div>
        );
    } else if (status === 'error') {
        return (
            <div className={`upload-status status-error ${theme}`}>
                <span>Upload failed. Try again.</span>
            </div>
        );
    }

    return null;
};

export default UploadStatusIndicator;
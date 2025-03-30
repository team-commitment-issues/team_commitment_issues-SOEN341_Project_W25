// Components/UI/FileAttachment/FilePreview/TextPreview.tsx
import React from 'react';
import { useTheme } from '../../../../Context/ThemeContext.tsx';

interface TextPreviewProps {
    content: string | null;
    loading: boolean;
}

const TextPreview: React.FC<TextPreviewProps> = ({ content, loading }) => {
    const { theme } = useTheme();

    if (loading) {
        return (
            <div className={`text-preview ${theme} centered-text`}>
                Loading content...
            </div>
        );
    }

    if (!content) {
        return (
            <div className={`text-preview ${theme} centered-text`}>
                No content available
            </div>
        );
    }

    return (
        <div className={`text-preview ${theme}`}>
            {content}
        </div>
    );
};

export default TextPreview;
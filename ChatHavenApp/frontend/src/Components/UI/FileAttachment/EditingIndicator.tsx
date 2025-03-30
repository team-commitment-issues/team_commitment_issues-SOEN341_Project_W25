// Components/UI/FileAttachment/EditingIndicator.tsx
import React, { useState, useEffect } from 'react';

interface EditingIndicatorProps {
    username: string;
}

const EditingIndicator: React.FC<EditingIndicatorProps> = ({ username }) => {
    const [dots, setDots] = useState('.');

    // Animated dots for active editing
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '.' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="editing-indicator">
            <span className="editor-name">{username}</span> is editing{dots}
        </div>
    );
};

export default EditingIndicator;
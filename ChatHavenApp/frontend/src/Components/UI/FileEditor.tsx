// Components/UI/FileEditor.tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../Context/ThemeContext.tsx';

interface FileEditorProps {
    fileName: string;
    fileContent: string;
    onSave: (content: string) => Promise<void>;
    onCancel: () => void;
    loading?: boolean;
}

const FileEditor: React.FC<FileEditorProps> = ({
    fileName,
    fileContent,
    onSave,
    onCancel,
    loading = false
}) => {
    const { theme } = useTheme();
    const [content, setContent] = useState(fileContent);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setContent(fileContent);
    }, [fileContent]);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            setError(null);
            await onSave(content);
            // onSave should handle the success case
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save changes');
            setIsSaving(false);
        }
    };

    const containerStyle: React.CSSProperties = {
        padding: '15px',
        backgroundColor: theme === 'dark' ? '#1e1e1e' : '#fff',
        border: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 0 10px 0',
        borderBottom: `1px solid ${theme === 'dark' ? '#444' : '#ddd'}`,
    };

    const titleStyle: React.CSSProperties = {
        fontWeight: 'bold',
        fontSize: '16px',
        color: theme === 'dark' ? '#ddd' : '#333',
    };

    const textareaStyle: React.CSSProperties = {
        width: '100%',
        minHeight: '200px',
        padding: '10px',
        backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f9f9f9',
        color: theme === 'dark' ? '#ddd' : '#333',
        border: `1px solid ${theme === 'dark' ? '#555' : '#ccc'}`,
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '14px',
        resize: 'vertical',
    };

    const buttonContainerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        marginTop: '10px',
    };

    const buttonStyle: React.CSSProperties = {
        padding: '8px 15px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
    };

    const saveButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: '#4CAF50',
        color: 'white',
        opacity: isSaving || loading ? 0.7 : 1,
    };

    const cancelButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: theme === 'dark' ? '#555' : '#eee',
        color: theme === 'dark' ? '#ddd' : '#333',
    };

    const errorStyle: React.CSSProperties = {
        color: '#f44336',
        fontSize: '14px',
        marginTop: '5px',
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <div style={titleStyle}>Editing: {fileName}</div>
            </div>

            <textarea
                style={textareaStyle}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isSaving || loading}
            />

            {error && <div style={errorStyle}>{error}</div>}

            <div style={buttonContainerStyle}>
                <button
                    style={cancelButtonStyle}
                    onClick={onCancel}
                    disabled={isSaving || loading}
                >
                    Cancel
                </button>
                <button
                    style={saveButtonStyle}
                    onClick={handleSave}
                    disabled={isSaving || loading}
                >
                    {isSaving || loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};

export default FileEditor;
// Components/UI/FileAttachment/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../Context/ThemeContext.tsx';
import { useUser } from '../../../Context/UserContext.tsx';
import FileEditor from '../FileEditor.tsx';
import EditHistoryTooltip from './editHistoryTooltip.tsx';
import EditingIndicator from './EditingIndicator.tsx';
import UploadStatusIndicator from './UploadStatusIndicator.tsx';
import FilePreview from './FilePreview/index.tsx';
import useFileContent from './useFileContent.ts';
import { useEditLock } from './useEditLock.ts';
import {
    isImageFile,
    isTextFile,
    formatFileSize,
    getFileIcon,
    getAuthenticatedUrl
} from './utils.ts';
import { Selection } from '../../../types/shared.ts';
import '../../../Styles/FileAttachment.css';
import WebSocketClient from '../../../Services/webSocketClient.ts';

interface FileAttachmentProps {
    fileName: string;
    fileType: string;
    fileUrl: string;
    fileSize?: number;
    uploadStatus?: 'pending' | 'completed' | 'error';
    messageId?: string;
    editedBy?: string;
    editedAt?: Date;
    selection?: Selection | null;
}

const FileAttachment: React.FC<FileAttachmentProps> = ({
    fileName,
    fileType,
    fileUrl,
    fileSize,
    uploadStatus = fileUrl ? 'completed' : 'pending',
    messageId,
    editedBy,
    editedAt,
    selection
}) => {
    const { theme } = useTheme();
    const { userData } = useUser();
    const username = userData?.username || '';
    const editedInfoRef = useRef<HTMLDivElement>(null);

    // State
    const [showPreview, setShowPreview] = useState(false);
    const [fileVersion, setFileVersion] = useState(Date.now());
    const [showHistoryTooltip, setShowHistoryTooltip] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

    // Custom hooks
    const {
        textContent,
        loading,
        fetchContent,
        clearContent
    } = useFileContent({
        fileName,
        fileUrl,
        fileVersion
    });

    const {
        editLock,
        isEditing,
        editLoading,
        editHistory,
        editedInfo,
        requestEditLock,
        releaseEditLock,
        saveEditedContent,
        fetchEditHistory,
        setEditedInfo
    } = useEditLock({
        messageId,
        fileName,
        username,
        selection
    });

    // Update tooltip position when visibility changes
    useEffect(() => {
        if (showHistoryTooltip && editedInfoRef.current) {
            const rect = editedInfoRef.current.getBoundingClientRect();
            setTooltipPosition({
                top: rect.top,
                left: rect.left + (rect.width / 2)
            });
        }
    }, [showHistoryTooltip]);

    // Load edited info from localStorage on mount
    useEffect(() => {
        if (messageId && (!editedBy || !editedAt)) {
            try {
                const editInfoKey = `file_edit_info_${messageId}_${fileName}`;
                const storedInfo = localStorage.getItem(editInfoKey);

                if (storedInfo) {
                    const parsedInfo = JSON.parse(storedInfo);
                    if (parsedInfo.editedBy && parsedInfo.editedAt) {
                        console.log('Loaded edit info from localStorage:', parsedInfo);
                        setEditedInfo({
                            editedBy: parsedInfo.editedBy,
                            editedAt: new Date(parsedInfo.editedAt)
                        });
                    }
                }
            } catch (err) {
                console.error('Error loading edit info from localStorage:', err);
            }
        }
    }, [messageId, fileName, editedBy, editedAt, setEditedInfo]);

    // Listen for file updates via WebSocket
    useEffect(() => {
        const wsService = WebSocketClient.getInstance();

        const handleFileUpdated = (data: any) => {
            if (data.type === 'fileUpdated' && data.messageId === messageId) {
                console.log('File updated notification received in FileAttachment:', data);

                // Force a refresh by updating the file version
                setFileVersion(Date.now());

                // Clear cached content to force reload on next view
                clearContent();

                // Update edited by information
                if (data.editedBy) {
                    const editTime = data.editedAt ? new Date(data.editedAt) : new Date();
                    setEditedInfo({
                        editedBy: data.editedBy,
                        editedAt: editTime
                    });

                    console.log('Updated edited info in FileAttachment:', {
                        editedBy: data.editedBy,
                        editedAt: editTime
                    });

                    // Store in localStorage to persist across page reloads
                    if (messageId) {
                        try {
                            const editInfoKey = `file_edit_info_${messageId}_${fileName}`;
                            localStorage.setItem(editInfoKey, JSON.stringify({
                                editedBy: data.editedBy,
                                editedAt: data.editedAt || new Date().toISOString()
                            }));
                            console.log('Saved edit info to localStorage:', editInfoKey);
                        } catch (err) {
                            console.error('Error saving edit info to localStorage:', err);
                        }
                    }
                }

                // If the preview is currently open, reload the content automatically
                if (showPreview && isTextFile(fileName)) {
                    console.log('Reloading file content after update');
                    // Short delay to ensure the backend has finished writing the file
                    setTimeout(() => {
                        fetchContent();
                    }, 200);
                }
            }
        };

        const fileUpdatedSubId = wsService.subscribe('fileUpdated', handleFileUpdated);

        console.log(`FileAttachment subscribed to fileUpdated events for messageId: ${messageId}`);

        return () => {
            wsService.unsubscribe(fileUpdatedSubId);
            console.log(`FileAttachment unsubscribed from fileUpdated events for messageId: ${messageId}`);
        };
    }, [messageId, fileName, showPreview, fetchContent, clearContent, setEditedInfo]);

    const handleOpenFile = async () => {
        if (isTextFile(fileName) && !textContent && !showPreview) {
            await fetchContent();
            setShowPreview(true);
        } else {
            setShowPreview(!showPreview);
        }
    };

    // Is text file and eligible for editing
    const canEdit = isTextFile(fileName) &&
        uploadStatus === 'completed' &&
        fileUrl &&
        fileUrl !== '#pending-upload' &&
        fileUrl !== '' &&
        (!editLock || editLock.username === username);

    // Determine if we should show edit button
    const showEditButton = isTextFile(fileName) && messageId && uploadStatus === 'completed';

    const handleMouseEnter = () => {
        fetchEditHistory();
        setShowHistoryTooltip(true);
    };

    const handleMouseLeave = () => {
        setShowHistoryTooltip(false);
    };

    return (
        <div className={`file-attachment-container ${theme}`}>
            <div className={`file-info ${showPreview ? 'preview-visible' : ''} ${theme}`}>
                <div className="file-icon">{getFileIcon(fileType, fileName)}</div>
                <div className="file-details">
                    <div className={`file-name ${theme}`}>{fileName}</div>
                    {editedInfo && !editLock && (
                        <div
                            ref={editedInfoRef}
                            className={`edited-info ${theme}`}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                        >
                            Edited by {editedInfo.editedBy}
                        </div>
                    )}
                    {editLock && editLock.username !== username && (
                        <div className={`editing-indicator ${theme}`}>
                            Currently being edited by {editLock.username}
                        </div>
                    )}
                </div>
                {fileSize && <div className={`file-size ${theme}`}>{formatFileSize(fileSize)}</div>}

                {isImageFile(fileType) ? (
                    <button
                        className={`file-button ${theme} ${(!fileUrl || fileUrl === '#pending-upload' || fileUrl === '' || loading) ? 'button-disabled' : ''}`}
                        onClick={() => {
                            if (!fileUrl || fileUrl === '#pending-upload' || fileUrl === '') {
                                alert('File is still uploading, please wait...');
                                return;
                            }
                            setShowPreview(!showPreview);
                        }}
                        disabled={loading || !fileUrl || fileUrl === '#pending-upload' || fileUrl === ''}
                    >
                        {fileUrl && fileUrl !== '#pending-upload' && fileUrl !== ''
                            ? (showPreview ? 'Hide' : 'View')
                            : 'Uploading...'}
                    </button>
                ) : isTextFile(fileName) ? (
                    <>
                        <button
                            className={`file-button ${theme} ${(!fileUrl || fileUrl === '#pending-upload' || fileUrl === '' || loading) ? 'button-disabled' : ''}`}
                            onClick={handleOpenFile}
                            disabled={loading || !fileUrl || fileUrl === '#pending-upload' || fileUrl === ''}
                        >
                            {loading ? 'Loading...' :
                                (!fileUrl || fileUrl === '#pending-upload' || fileUrl === '') ? 'Uploading...' :
                                    (showPreview ? 'Close' : 'Open')}
                        </button>

                        <div className="file-actions">
                            {/* Edit button - only show if no one is editing and file is ready */}
                            {showEditButton && !editLock && (
                                <button
                                    className={`file-button edit-button ${theme} ${(!canEdit || editLoading) ? 'button-disabled' : ''}`}
                                    onClick={requestEditLock}
                                    disabled={!canEdit || editLoading}
                                    title="Edit file content"
                                >
                                    {editLoading ? 'Loading...' : 'Edit'}
                                </button>
                            )}

                            {/* Show editing indicator if lock exists and user is not the current editor */}
                            {editLock && editLock.username !== username && (
                                <EditingIndicator username={editLock.username} />
                            )}

                            {/* Cancel editing button if current user is editing */}
                            {isEditing && (
                                <button
                                    className={`file-button cancel-button ${theme}`}
                                    onClick={releaseEditLock}
                                >
                                    Cancel Editing
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <a
                        href={(!fileUrl || fileUrl === '#pending-upload' || fileUrl === '') ? '#' : getAuthenticatedUrl(fileUrl, fileVersion)}
                        className={`file-button file-download-link ${theme} ${(!fileUrl || fileUrl === '#pending-upload' || fileUrl === '') ? 'button-disabled' : ''}`}
                        download={fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                            if (!fileUrl || fileUrl === '#pending-upload' || fileUrl === '') {
                                e.preventDefault();
                                alert('File is still uploading, please wait...');
                            }
                        }}
                    >
                        {(!fileUrl || fileUrl === '#pending-upload' || fileUrl === '') ? 'Uploading...' : 'Download'}
                    </a>
                )}
            </div>

            {uploadStatus !== 'completed' && <UploadStatusIndicator status={uploadStatus} />}

            {/* Tooltip rendered at the root level instead of nested */}
            {showHistoryTooltip && editHistory && editHistory.length > 0 && (
                <div
                    className="tooltip-portal"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: 9999
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            top: `${Math.max(0, tooltipPosition.top - 170)}px`,
                            left: `${tooltipPosition.left}px`,
                            transform: 'translateX(-50%)',
                            pointerEvents: 'auto'
                        }}
                    >
                        <EditHistoryTooltip
                            history={editHistory}
                            visible={showHistoryTooltip}
                        />
                    </div>
                </div>
            )}

            {/* Preview section */}
            {showPreview && !isEditing && (
                <FilePreview
                    fileName={fileName}
                    fileType={fileType}
                    fileUrl={fileUrl}
                    fileVersion={fileVersion}
                    textContent={textContent}
                    loading={loading}
                />
            )}

            {/* File editor component */}
            {isEditing && textContent !== null && (
                <FileEditor
                    fileName={fileName}
                    fileContent={textContent}
                    onSave={async (content: string) => {
                        saveEditedContent(content);
                    }}
                    onCancel={releaseEditLock}
                    loading={editLoading}
                />
            )}
        </div>
    );
};

export default FileAttachment;
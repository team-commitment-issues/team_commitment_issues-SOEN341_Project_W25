import React from 'react';
import { useTheme } from '../../../Context/ThemeContext.tsx';
import MessageStatusIndicator from '../../UI/MessageStatusIndicator.tsx';
import FileAttachment from '../../UI/FileAttachment/index.tsx';
import QuotedMessage from './QuotedMessage.tsx';
import { ChatMessage, Selection } from '../../../types/shared.ts';
import styles from '../../../Styles/dashboardStyles.ts';
import { FileInfo } from '../types/index.ts';

interface MessageItemProps {
    message: ChatMessage;
    isCurrentUser: boolean;
    onContextMenu: (e: React.MouseEvent, messageId: string) => void;
    onResend: (message: ChatMessage) => void;
    selection: Selection | null; // Add selection prop
}

const MessageItem: React.FC<MessageItemProps> = ({
    message,
    isCurrentUser,
    onContextMenu,
    onResend,
    selection
}) => {
    const { theme } = useTheme();

    const getStyledComponent = (baseStyle: any) => ({
        ...baseStyle,
        ...(theme === 'dark' && baseStyle['&.dark-mode'])
    });

    // Check if this is a file message
    const isFileAttachment = !!(
        message.fileName &&
        message.fileType &&
        (message.status === 'pending' || message.fileUrl || message.fileUrl === '')
    );

    // Prepare file info if needed
    let fileInfo: FileInfo | undefined;
    if (isFileAttachment) {
        const uploadStatus =
            message.status === 'failed' ? 'error' :
                (!message.fileUrl || message.fileUrl === '') ? 'pending' : 'completed';

        fileInfo = {
            fileName: message.fileName || 'Unknown File',
            fileType: message.fileType || 'unknown',
            fileUrl: message.fileUrl || '',
            fileSize: message.fileSize,
            uploadStatus
        };
    }

    return (
        <div
            key={
                message._id ||
                message.clientMessageId ||
                (message.createdAt ? message.createdAt.getTime() : Date.now() + Math.random())
            }
            onContextMenu={e => onContextMenu(e, message._id)}
            style={
                {
                    ...getStyledComponent(styles.chatMessage),
                    alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
                    backgroundColor:
                        isCurrentUser
                            ? theme === 'dark'
                                ? '#2b5278'
                                : '#DCF8C6'
                            : theme === 'dark'
                                ? '#383838'
                                : '#FFF',
                    opacity: message.status === 'failed' ? 0.7 : 1,
                    padding: '10px',
                    margin: '5px 0',
                    borderRadius: '8px',
                    maxWidth: '80%',
                    wordBreak: 'break-word'
                } as React.CSSProperties
            }
            aria-label={`Message from ${message.username}`}
        >
            <div>
                <strong>{message.username}</strong>&nbsp;

                {/* Render quoted message if it exists */}
                {message.quotedMessage && (
                    <QuotedMessage quotedMessage={message.quotedMessage} />
                )}

                {/* Show message text content if it's not a file-only message
            or if it has additional text content */}
                {(!isFileAttachment || (isFileAttachment && !message.text?.startsWith('[File]'))) && (
                    <span>{message.text}</span>
                )}

                {/* Render file attachment if we have file info */}
                {isFileAttachment && fileInfo && (
                    <FileAttachment
                        fileName={fileInfo.fileName || 'Unknown File'}
                        fileType={fileInfo.fileType || ''}
                        fileUrl={fileInfo.fileUrl}
                        fileSize={fileInfo.fileSize}
                        uploadStatus={fileInfo.uploadStatus}
                        messageId={message._id}
                        editedBy={message.editedBy}
                        editedAt={message.editedAt}
                        selection={selection} // Pass selection to FileAttachment
                    />
                )}

                <div
                    style={{
                        fontSize: '11px',
                        marginTop: '3px',
                        color: theme === 'dark' ? '#aaa' : '#777',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}
                >
                    <span>
                        {message.createdAt ? message.createdAt.toLocaleString() : 'Unknown Date'}
                    </span>

                    {isCurrentUser && (
                        <MessageStatusIndicator status={message.status} dark={theme === 'dark'} />
                    )}
                </div>

                {message.status === 'failed' && (
                    <button
                        onClick={() => onResend(message)}
                        style={{
                            marginTop: '5px',
                            padding: '2px 8px',
                            background: theme === 'dark' ? '#444' : '#f0f0f0',
                            border: '1px solid ' + (theme === 'dark' ? '#555' : '#ddd'),
                            borderRadius: '3px',
                            cursor: 'pointer',
                            color: '#F15050',
                            fontSize: '12px'
                        }}
                    >
                        Retry
                    </button>
                )}
            </div>
        </div>
    );
};

export default React.memo(MessageItem);
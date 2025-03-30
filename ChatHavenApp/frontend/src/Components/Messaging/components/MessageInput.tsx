import React, { useState, useRef } from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useTheme } from '../../../Context/ThemeContext.tsx';
import { useMessageContext } from '../context/MessageContext.ts';
import QuotedMessage from './QuotedMessage.tsx';
import styles from '../../../Styles/dashboardStyles.ts';
import { Selection } from '../../../types/shared.ts';

interface MessageInputProps {
    selection: Selection | null;
    connectionStatus: 'connected' | 'connecting' | 'disconnected';
}

const MessageInput: React.FC<MessageInputProps> = ({
    selection,
    connectionStatus
}) => {
    const { theme } = useTheme();
    const {
        quotedMessage,
        sendTextMessage,
        uploadFile,
        clearQuotedMessage,
        handleTypingChange
    } = useMessageContext();

    const [message, setMessage] = useState<string>('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getStyledComponent = (baseStyle: any) => ({
        ...baseStyle,
        ...(theme === 'dark' && baseStyle['&.dark-mode'])
    });

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        setMessage(prevMessage => prevMessage + emojiData.emoji);
        setShowEmojiPicker(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newText = e.target.value;
        setMessage(newText);

        // Notify about typing status
        handleTypingChange(newText);
    };

    const handleFileButtonClick = () => {
        // Trigger file input click
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            uploadFile(files);

            // Reset the file input so the same file can be uploaded again
            e.target.value = '';
        }
    };

    const handleSendMessage = () => {
        if (!message.trim() || !selection) return;
        else if (message.length > 500) {
            alert('Message too long, max 500 characters allowed');
            return;
        }

        sendTextMessage(message);
        setMessage('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div style={getStyledComponent(styles.inputBox)}>
            {/* Quoted message preview */}
            {quotedMessage && (
                <div style={{ width: '100%', paddingBottom: '5px' }}>
                    <QuotedMessage
                        quotedMessage={quotedMessage}
                        preview={true}
                        onCancel={clearQuotedMessage}
                    />
                </div>
            )}

            {/* Message input */}
            <input
                type="text"
                placeholder={
                    connectionStatus !== 'connected'
                        ? 'Waiting for connection...'
                        : selection
                            ? 'Type a message...'
                            : 'Select a channel or user to chat with'
                }
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                style={getStyledComponent(styles.inputField)}
                disabled={connectionStatus !== 'connected' || !selection}
                aria-label="Message input"
            />

            {/* Upload icon with hidden input */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
                    style={{ display: 'none' }}
                    id="fileUpload"
                    onChange={handleFileChange}
                />
                <button
                    type="button"
                    onClick={handleFileButtonClick}
                    style={getStyledComponent(styles.uploadButton)}
                    disabled={connectionStatus !== 'connected' || !selection}
                    aria-label="Attach file"
                >
                    📎
                </button>
            </div>

            {/* Emoji button */}
            <button
                type="button"
                onClick={() => setShowEmojiPicker(prev => !prev)}
                style={getStyledComponent(styles.emojiButton)}
                disabled={connectionStatus !== 'connected' || !selection}
                aria-label="Select emoji"
            >
                &#128512;
            </button>

            {/* Send button */}
            <button
                type="button"
                onClick={handleSendMessage}
                style={{
                    ...getStyledComponent(styles.sendButton),
                    ...((connectionStatus !== 'connected' || !selection) && {
                        opacity: 0.5,
                        cursor: 'not-allowed'
                    })
                }}
                disabled={connectionStatus !== 'connected' || !selection}
                aria-label="Send message"
            >
                Send
            </button>

            {/* Emoji picker popup */}
            {showEmojiPicker && (
                <div style={getStyledComponent(styles.emojiPickerContainer)}>
                    <EmojiPicker onEmojiClick={handleEmojiClick} />
                </div>
            )}
        </div>
    );
};

export default MessageInput;
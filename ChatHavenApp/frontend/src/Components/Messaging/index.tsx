import React, { useCallback } from 'react';
import { useUser } from '../../Context/UserContext.tsx';
import MessageHeader from './components/MessageHeader.tsx';
import MessageList from './components/MessageList.tsx';
import MessageInput from './components/MessageInput.tsx';
import ContextMenu from '../UI/ContextMenu.tsx';
import { MessageProvider } from './context/MessageContext.ts';
import { Selection, ContextMenuState } from '../../types/shared.ts';

interface MessagingProps {
    selection: Selection | null;
    contextMenu: ContextMenuState;
    setContextMenu: (arg: ContextMenuState) => void;
}

const Messaging: React.FC<MessagingProps> = ({
    selection,
    contextMenu,
    setContextMenu
}) => {
    const { userData } = useUser();
    const username = userData?.username || '';

    const handleContextMenu = useCallback((event: React.MouseEvent, messageId: string) => {
        event.preventDefault();
        setContextMenu({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            selected: messageId
        });
    }, [setContextMenu]);

    const handleCloseContextMenu = useCallback(() => {
        setContextMenu({ visible: false, x: 0, y: 0, selected: '' });
    }, [setContextMenu]);

    const handleQuoteMessage = useCallback(() => {
        // The actual quoting is handled in the MessageContext
        // This just closes the context menu after selecting the quote option
        handleCloseContextMenu();
    }, [handleCloseContextMenu]);

    const handleDeleteMessage = useCallback(() => {
        // The actual deletion is handled in the MessageContext
        // This just closes the context menu after selecting the delete option
        handleCloseContextMenu();
    }, [handleCloseContextMenu]);

    const menuItems = [
        { label: 'Quote Message', onClick: handleQuoteMessage },
        { label: 'Delete Message', onClick: handleDeleteMessage }
    ];

    return (
        <MessageProvider selection={selection} username={username}>
            <div className="messaging-container">
                <MessageHeader
                    selection={selection}
                    connectionStatus="connected"
                />

                <MessageList
                    selection={selection}
                    username={username}
                    onContextMenu={handleContextMenu}
                />

                <MessageInput
                    selection={selection}
                    connectionStatus="connected"
                />

                {contextMenu.visible && (
                    <ContextMenu
                        items={menuItems}
                        position={{ x: contextMenu.x, y: contextMenu.y }}
                        onClose={handleCloseContextMenu}
                    />
                )}
            </div>
        </MessageProvider>
    );
};

export default Messaging;
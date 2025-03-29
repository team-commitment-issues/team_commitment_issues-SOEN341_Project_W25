import React, { useEffect, useState, useRef, useCallback } from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import styles from '../Styles/dashboardStyles.ts';
import { deleteMessage } from '../Services/channelService.ts';
import ContextMenu from './UI/ContextMenu.tsx';
import { useTheme } from '../Context/ThemeContext.tsx';
import UserStatusIndicator from './UI/UserStatusIndicator.tsx';
import MessageStatusIndicator from './UI/MessageStatusIndicator.tsx';
import WebSocketClient from '../Services/webSocketClient.ts';
import FileAttachment from './UI/FileAttachment.tsx';
import { useUser } from '../Context/UserContext.tsx';
import {
  Selection,
  ContextMenuState,
  ChatMessage,
  WebSocketMessage,
  RetryInfo,
  MessageStatus,
  QuotedMessage
} from '../types/shared.ts';

// Constants for message retry
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 3000;

interface MessagingProps {
  selection: Selection | null;
  contextMenu: ContextMenuState;
  setContextMenu: (arg: ContextMenuState) => void;
}

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

const Messaging: React.FC<MessagingProps> = ({ selection, contextMenu, setContextMenu }) => {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [typingIndicator, setTypingIndicator] = useState<{
    username: string;
    isTyping: boolean;
  } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // State for emoji picker visibility
  const [pendingMessages, setPendingMessages] = useState<Map<string, RetryInfo>>(new Map());
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [oldestMessageId, setOldestMessageId] = useState<string | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [quotedMessage, setQuotedMessage] = useState<QuotedMessage | null>(null);

  // Refs
  const heartbeatInterval = useRef<number | null>(null);
  const currentSelection = useRef<Selection | null>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const lastScrollHeight = useRef<number>(0);
  const scrollPositionRef = useRef<number>(0);
  const isMounted = useRef(true);
  const messageSubscriptionRef = useRef<string | null>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());

  // Shared WebSocket service
  const wsService = WebSocketClient.getInstance();

  const { theme } = useTheme();
  const token = localStorage.getItem('token');
  const { userData } = useUser();
  const username = userData?.username || '';

  // Helper functions
  const getSelectionTitle = () => {
    if (!selection) return 'No selection';

    if (selection.type === 'channel') {
      return `Channel: ${selection.channelName}`;
    } else {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Direct Messages with {selection.username || 'Unknown User'}</span>
          <UserStatusIndicator
            username={selection.username || 'Unknown User'}
            showStatusText={true}
            size="medium"
          />
        </div>
      );
    }
  };

  const getStyledComponent = useCallback(
    (baseStyle: any) => ({
      ...baseStyle,
      ...(theme === 'dark' && baseStyle['&.dark-mode'])
    }),
    [theme]
  );

  const clearHeartbeat = () => {
    if (heartbeatInterval.current) {
      if (heartbeatInterval.current !== null) {
        window.clearInterval(heartbeatInterval.current);
      }
      heartbeatInterval.current = null;
    }
  };

  const sendTypingStatus = (isTyping: boolean) => {
    if (!wsService.isConnected() || !selection) return;

    const typingMessage: WebSocketMessage =
      selection.type === 'channel'
        ? {
          type: 'typing',
          isTyping,
          username,
          teamName: selection.teamName,
          channelName: selection.channelName
        }
        : {
          type: 'typing',
          isTyping,
          username,
          teamName: selection.teamName,
          receiverUsername: selection.username
        };

    wsService.send(typingMessage);
  };

  // Function to track pending messages and handle retries
  const trackPendingMessage = useCallback(
    (messageData: WebSocketMessage, clientMessageId: string) => {
      const timeout = setTimeout(() => {
        setPendingMessages(prev => {
          const pending = prev.get(clientMessageId);

          if (pending && pending.attempts < MAX_RETRY_ATTEMPTS) {
            console.log(`Retrying message ${clientMessageId}, attempt ${pending.attempts + 1}`);

            if (wsService.isConnected()) {
              wsService.send(messageData);
            }

            const updated = new Map(prev);
            updated.set(clientMessageId, {
              message: messageData,
              attempts: pending.attempts + 1,
              timeout: setTimeout(
                () => trackPendingMessage(messageData, clientMessageId),
                RETRY_DELAY_MS
              ) as unknown as NodeJS.Timeout,
              createdAt: messageData.createdAt || Date.now()
            });
            return updated;
          } else {
            setMessages(prevMsgs =>
              prevMsgs.map(msg =>
                msg.clientMessageId === clientMessageId ? { ...msg, status: 'failed' } : msg
              )
            );

            const updated = new Map(prev);
            updated.delete(clientMessageId);
            return updated;
          }
        });
      }, RETRY_DELAY_MS);

      setPendingMessages(prev => {
        const updated = new Map(prev);
        updated.set(clientMessageId, {
          message: messageData,
          attempts: 0,
          timeout: timeout as unknown as NodeJS.Timeout,
          createdAt: messageData.createdAt || Date.now()
        });
        return updated;
      });
    },
    [wsService]
  );

  // Sending messages with client-side tracking
  const sendMessage = useCallback(
    (messageData: WebSocketMessage) => {
      console.log('Sending message with data:', messageData);
      const clientMessageId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const messageWithId: WebSocketMessage = {
        ...messageData,
        clientMessageId,
        text: messageData.text || ''
      };

      if (wsService.isConnected()) {
        wsService.send(messageWithId);

        wsService.registerMessageStatusCallback(clientMessageId, status => {
          console.log(`Received status update for message ${clientMessageId}:`, status);
          setMessages(prevMsgs =>
            prevMsgs.map(msg =>
              msg.clientMessageId === clientMessageId
                ? { ...msg, status: status as MessageStatus }
                : msg
            )
          );
        });

        const newMessage: ChatMessage = {
          _id: '', // Server will assign a real ID
          text: messageWithId.text || '',
          username,
          createdAt: new Date(),
          status: 'pending',
          clientMessageId,
          ...(messageData.fileName && {
            fileName: messageData.fileName,
            fileType: messageData.fileType,
            // Note: fileUrl will be assigned by the server
            fileSize: messageData.fileSize
          }),
          ...(messageData.quotedMessage && {
            quotedMessage: {
              _id: messageData.quotedMessage._id,
              text: messageData.quotedMessage.text,
              username: messageData.quotedMessage.username
            }
          })
        };

        console.log('Adding pending message to state:', newMessage);

        setMessages(prev => [...prev, newMessage]);
      } else {
        // Add message to state with pending status
        const newMessage: ChatMessage = {
          _id: '',
          text: messageWithId.text || '',
          username,
          createdAt: new Date(),
          status: 'pending',
          clientMessageId,
          // Include file information if it exists
          ...(messageData.fileName && {
            fileName: messageData.fileName,
            fileType: messageData.fileType,
            fileSize: messageData.fileSize
          }),
          ...(messageData.quotedMessage && {
            quotedMessage: {
              _id: messageData.quotedMessage._id,
              text: messageData.quotedMessage.text,
              username: messageData.quotedMessage.username
            }
          })
        };

        setMessages(prev => [...prev, newMessage]);

        // This will be queued by the service
        wsService.send(messageWithId);
      }

      return clientMessageId;
    },
    [username, wsService]
  );

  // Function to handle message resend
  const handleResendMessage = useCallback(
    (message: ChatMessage) => {
      // Create a new message based on the failed one
      const newMessage: WebSocketMessage = {
        type: selection?.type === 'directMessage' ? 'directMessage' : 'message',
        text: message.text,
        username,
        teamName: selection?.teamName || '',
        ...(selection?.type === 'directMessage'
          ? { receiverUsername: selection?.username || '' }
          : { channelName: selection?.channelName || '' })
      };

      // Remove the failed message
      setMessages(prev =>
        prev.filter(
          msg =>
            (msg._id && msg._id !== message._id) ||
            (msg.clientMessageId && msg.clientMessageId !== message.clientMessageId)
        )
      );

      // Send the new message
      sendMessage(newMessage);
    },
    [selection, sendMessage, username]
  );

  // Function to load older messages
  const loadOlderMessages = useCallback(() => {
    if (!wsService.isConnected() || !selection || isLoadingHistory || !hasMoreMessages) {
      return;
    }

    setIsLoadingHistory(true);

    const historyRequest: WebSocketMessage =
      selection.type === 'channel'
        ? {
          type: 'fetchHistory',
          teamName: selection.teamName,
          channelName: selection.channelName,
          before: oldestMessageId || undefined,
          limit: 25
        }
        : {
          type: 'fetchHistory',
          teamName: selection.teamName,
          username: selection.username,
          before: oldestMessageId || undefined,
          limit: 25
        };

    wsService.send(historyRequest);

    // Store current scroll position for restoration
    if (chatBoxRef.current) {
      lastScrollHeight.current = chatBoxRef.current.scrollHeight;
      scrollPositionRef.current = chatBoxRef.current.scrollTop;
    }
  }, [selection, isLoadingHistory, hasMoreMessages, oldestMessageId, wsService]);

  // Handle scroll to detect when to load more messages
  const handleScroll = useCallback(() => {
    if (!chatBoxRef.current) return;

    // Check if user has scrolled near the top (threshold of 100px)
    const { scrollTop } = chatBoxRef.current;

    if (scrollTop < 100 && hasMoreMessages && !isLoadingHistory) {
      loadOlderMessages();
    }
  }, [hasMoreMessages, isLoadingHistory, loadOlderMessages]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prevMessage => prevMessage + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);

    // Send typing indicator
    if (!isTyping) {
      setIsTyping(true);
      sendTypingStatus(true);
    }

    // Clear previous timeout
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    // Set new timeout
    typingTimeout.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingStatus(false);
    }, 3000);
  };

  const sendJoinMessage = useCallback(
    (sel: Selection) => {
      if (!wsService.isConnected() || !sel) return;

      const joinMessage: WebSocketMessage =
        sel.type === 'channel'
          ? {
            type: 'join',
            teamName: sel.teamName,
            channelName: sel.channelName
          }
          : {
            type: 'joinDirectMessage',
            teamName: sel.teamName,
            username: sel.username
          };

      wsService.send(joinMessage);
    },
    [wsService]
  );

  const handleSendMessage = () => {
    if (!message.trim() || !selection) return;
    else if (message.length > 500) {
      alert('Message too long, max 500 characters allowed');
      return;
    }

    const currentQuotedMessage = quotedMessage;

    const newMessage: WebSocketMessage =
      selection.type === 'directMessage'
        ? {
          type: 'directMessage',
          text: message,
          teamName: selection.teamName,
          receiverUsername: selection.username,
          ...(currentQuotedMessage && { quotedMessage: currentQuotedMessage })
        }
        : {
          type: 'message',
          text: message,
          username,
          teamName: selection.teamName,
          channelName: selection.channelName,
          ...(currentQuotedMessage && { quotedMessage: currentQuotedMessage })
        };

    sendMessage(newMessage);
    setMessage('');
    setQuotedMessage(null);

    // Clear typing indicator when sending a message
    if (isTyping) {
      setIsTyping(false);
      sendTypingStatus(false);

      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
        typingTimeout.current = null;
      }
    }
  };

  // Fetch messages using WebSocket
  const fetchMessages = useCallback(() => {
    if (!selection || !wsService.isConnected()) {
      setMessages([]);
      setHasMoreMessages(false);
      setOldestMessageId(null);
      setInitialLoadDone(false);
      return;
    }

    setIsLoadingHistory(true);
    setInitialLoadDone(false);

    // Clear the processed message IDs set when starting a new fetch
    processedMessageIds.current = new Set();

    const historyRequest: WebSocketMessage =
      selection.type === 'channel'
        ? {
          type: 'fetchHistory',
          teamName: selection.teamName,
          channelName: selection.channelName,
          limit: 50
        }
        : {
          type: 'fetchHistory',
          teamName: selection.teamName,
          username: selection.username,
          limit: 50
        };

    wsService.send(historyRequest);
  }, [selection, wsService]);

  const handleDeleteMessage = async () => {
    if (!contextMenu.selected || !selection || selection.type !== 'channel') return;

    try {
      if (contextMenu.selected && selection.type === 'channel' && selection.channelName) {
        await deleteMessage(selection.teamName, selection.channelName, contextMenu.selected);
      } else {
        console.error('No message selected for deletion.');
      }
      setMessages(prev => prev.filter(msg => msg._id !== contextMenu.selected));
      setContextMenu({ visible: false, x: 0, y: 0, selected: '' });
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  };

  const handleContextMenu = (event: React.MouseEvent, messageId: string) => {
    event.preventDefault();
    setContextMenu({ visible: true, x: event.clientX, y: event.clientY, selected: messageId });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, selected: '' });
  };

  // Register scroll handler
  useEffect(() => {
    const chatBoxElement = chatBoxRef.current;
    if (chatBoxElement) {
      chatBoxElement.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (chatBoxElement) {
        chatBoxElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll]);

  // Setup WebSocket message handlers
  useEffect(() => {
    if (!token) return;

    const handleConnection = () => {
      setConnectionStatus('connected');

      // If we have a selection, join the channel or DM
      if (selection) {
        sendJoinMessage(selection);
        fetchMessages();
      }
    };

    const handleDisconnection = () => {
      setConnectionStatus('disconnected');
    };

    const handleError = () => {
      setConnectionStatus('disconnected');
    };

    const handleMessage = (data: any) => {
      console.log('★★★ WebSocket message received:', data);
      if ((data.type === 'message' || data.type === 'directMessage') &&
        (data.fileName || data.fileUrl || (data.text && data.text.startsWith('[File]')))) {
        console.log('⭐⭐⭐ FILE MESSAGE RECEIVED:', {
          type: data.type,
          id: data._id,
          text: data.text,
          fileName: data.fileName,
          fileType: data.fileType,
          fileUrl: data.fileUrl,
          hasFileProps: !!(data.fileName && data.fileType && data.fileUrl),
          ...(data.quotedMessage && {
            quotedMessage: {
              _id: data.quotedMessage._id,
              text: data.quotedMessage.text,
              username: data.quotedMessage.username
            }
          })
        });
      }
      // check both _id and clientMessageId
      const isDuplicate = (messageData: any): boolean => {
        // Check if we've already processed this message ID
        if (messageData._id && processedMessageIds.current.has(messageData._id)) {
          return true;
        }

        // Check if it's a message we sent that's already in our state
        if (
          messageData.clientMessageId &&
          messages.some(msg => msg.clientMessageId === messageData.clientMessageId)
        ) {
          return true;
        }

        // Mark as processed
        if (messageData._id) {
          processedMessageIds.current.add(messageData._id);
        }

        return false;
      };

      if (data.type === 'message' || data.type === 'directMessage') {
        // Avoid duplicates
        if (isDuplicate(data)) {
          return;
        }

        // Check if message matches current conversation context
        if (data.type === 'message') {
          // Only show channel messages if we're currently in a channel
          if (!selection || selection.type !== 'channel') {
            return; // Not viewing a channel, don't display this message
          }
        } else if (data.type === 'directMessage') {
          // Only show DMs if we're in the correct DM conversation
          if (
            !selection ||
            selection.type !== 'directMessage' ||
            (data.username !== username && data.username !== selection.username)
          ) {
            return; // Not in the correct DM conversation, don't display this message
          }
        }

        // Check if this is a message we sent (by matching usernames)
        if (data.username === username) {
          // Find pending message by matching text/content
          const pendingMessage = messages.find(
            msg =>
              msg.status === 'pending' && msg.text === data.text && msg.username === data.username
          );

          const pendingMessageById = messages.find(
            msg => msg.clientMessageId && msg.clientMessageId === data.clientMessageId
          );

          const matchedPendingMessage = pendingMessageById || pendingMessage;

          if (matchedPendingMessage) {
            console.log('Updating pending message with server response', {
              clientMessageId: data.clientMessageId,
              hasFileInfo: !!(data.fileName && data.fileType && data.fileUrl),
              hasQuotedMessage: !!data.quotedMessage
            });
            // Update message status to sent
            setMessages(prev =>
              prev.map(msg =>
                (msg === matchedPendingMessage ||
                  (msg.clientMessageId && msg.clientMessageId === data.clientMessageId))
                  ? {
                    ...msg,
                    _id: data._id,
                    status: 'sent',
                    ...(data.fileName && {
                      fileName: data.fileName,
                      fileType: data.fileType,
                      fileUrl: data.fileUrl,
                      fileSize: data.fileSize
                    }),
                    ...(msg.fileName && {
                      fileName: msg.fileName,
                      fileType: msg.fileType,
                      fileUrl: data.fileUrl || msg.fileUrl || '',
                      fileSize: msg.fileSize
                    }),
                    quotedMessage: data.quotedMessage ? {
                      _id: data.quotedMessage._id,
                      text: data.quotedMessage.text,
                      username: data.quotedMessage.username
                    } : msg.quotedMessage
                  }
                  : msg
              )
            );
          } else {
            // This is a new message from us (maybe from another client)
            setMessages(prev => [
              ...prev,
              {
                _id: data._id,
                text: data.text || '',
                username: data.username || '',
                createdAt: new Date(data.createdAt || new Date()),
                status: 'sent',
                // Include file information
                ...(data.fileName && {
                  fileName: data.fileName,
                  fileType: data.fileType,
                  fileUrl: data.fileUrl,
                  fileSize: data.fileSize
                }),
                ...(data.quotedMessage && {
                  quotedMessage: {
                    _id: data.quotedMessage._id,
                    text: data.quotedMessage.text,
                    username: data.quotedMessage.username
                  }
                })
              }
            ]);
          }

          // Send delivery acknowledgment
          wsService.send({
            type: 'messageAck',
            messageId: data._id,
            status: 'delivered'
          });
        } else {
          // This is a message from someone else
          setMessages(prev => [
            ...prev,
            {
              _id: data._id,
              text: data.text || '',
              username: data.username || '',
              createdAt: new Date(data.createdAt || new Date()),
              status: 'delivered',
              // Include file information
              ...(data.fileName && {
                fileName: data.fileName,
                fileType: data.fileType,
                fileUrl: data.fileUrl,
                fileSize: data.fileSize
              }),
              ...(data.quotedMessage && {
                quotedMessage: {
                  _id: data.quotedMessage._id,
                  text: data.quotedMessage.text,
                  username: data.quotedMessage.username
                }
              })
            }
          ]);

          // Send read receipt
          if (data._id) {
            wsService.send({
              type: 'messageAck',
              messageId: data._id,
              status: 'read'
            });
          }
        }
      } else if (data.type === 'messageAck') {
        // Update message status based on acknowledgment
        setMessages(prev =>
          prev.map(msg => (msg._id === data.messageId ? { ...msg, status: data.status } : msg))
        );
      } else if (data.type === 'historyResponse') {
        setIsLoadingHistory(false);
        setInitialLoadDone(true);

        console.log('📚 Raw history data received:', data.messages);

        // Process the messages
        const historyMessages = (data.messages || [])
          .filter((msg: any) => !isDuplicate(msg))
          .map((msg: any) => ({
            _id: msg._id,
            text: msg.text,
            username: msg.username,
            createdAt: new Date(msg.createdAt),
            status: msg.status || 'delivered',
            ...(msg.clientMessageId && { clientMessageId: msg.clientMessageId }),
            ...(msg.fileName && {
              fileName: msg.fileName,
              fileType: msg.fileType || 'application/octet-stream',
              fileUrl: msg.fileUrl || '',
              fileSize: msg.fileSize
            }),
            ...(msg.quotedMessage && {
              quotedMessage: {
                _id: msg.quotedMessage._id,
                text: msg.quotedMessage.text,
                username: msg.quotedMessage.username
              }
            })
          })
          );

        // Even if there are no messages, set initialLoadDone to true
        if (historyMessages.length === 0) {
          setOldestMessageId(null);
          setHasMoreMessages(false);
          // Don't replace existing messages if we're paginating
          if (!data.before) {
            setMessages([]);
          }
        } else {
          // If paginating (loading older messages), we need to find the oldest message
          // If initial load, we'll use the first message from the response
          const oldestMessageForPagination = data.before
            ? historyMessages.reduce(
              (
                oldest: { createdAt: string | number | Date },
                current: { createdAt: string | number | Date }
              ) =>
                new Date(oldest.createdAt).getTime() < new Date(current.createdAt).getTime()
                  ? oldest
                  : current
            )
            : historyMessages[0];

          setOldestMessageId(oldestMessageForPagination._id);

          // Update messages state based on whether this is pagination or initial load
          if (data.before) {
            // Pagination - prepend older messages
            setMessages(prev => [...historyMessages, ...prev]);
          } else {
            // Initial load - replace all messages
            setMessages(historyMessages);
          }

          // Update hasMoreMessages flag
          setHasMoreMessages(data.hasMore ?? false);

          // Restore scroll position after DOM update if paginating
          if (data.before) {
            setTimeout(() => {
              if (chatBoxRef.current) {
                const newScrollHeight = chatBoxRef.current.scrollHeight;
                const heightDifference = newScrollHeight - lastScrollHeight.current;
                chatBoxRef.current.scrollTop = scrollPositionRef.current + heightDifference;
              }
            }, 0);
          } else {
            // Scroll to bottom for initial load
            setTimeout(() => {
              if (chatBoxRef.current) {
                chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
              }
            }, 0);
          }
        }
      } else if (data.type === 'typing') {
        if (data.username !== username) {
          setTypingIndicator({
            username: data.username || '',
            isTyping: data.isTyping || false
          });

          // Clear typing indicator after 5 seconds if no update is received
          if (data.isTyping) {
            setTimeout(() => {
              setTypingIndicator(current => (current?.username === data.username ? null : current));
            }, 5000);
          } else {
            setTypingIndicator(null);
          }
        }
      } else if (data.type === 'fileUploadComplete') {
        console.log('🔔 File upload complete notification received:', {
          messageId: data.messageId,
          clientMessageId: data.clientMessageId,
          fileUrl: data.fileUrl,
          status: data.status
        });

        // Update the message with the file URL
        setMessages(prev =>
          prev.map(msg => {
            // Match by clientMessageId if available, otherwise try messageId
            const isMatch =
              (data.clientMessageId && msg.clientMessageId === data.clientMessageId) ||
              (data.messageId && msg._id === data.messageId);

            if (isMatch) {
              console.log('⭐ Updating file message with URL:', {
                messageId: msg._id,
                clientMessageId: msg.clientMessageId,
                oldFileUrl: msg.fileUrl,
                newFileUrl: data.fileUrl
              });

              return {
                ...msg,
                fileUrl: data.fileUrl,
                status: 'sent'
              };
            }
            return msg;
          })
        );
      } else if (data.type === 'fileUpdated') {
        // Find and update the message with edited file information
        setMessages(prev =>
          prev.map(msg =>
            msg._id === data.messageId
              ? {
                ...msg,
                editedBy: data.editedBy,
                editedAt: new Date(data.editedAt)
              }
              : msg
          )
        );

        // Show a notification that a file was updated
        // This could be implemented with a toast notification system
        console.log(`File updated by ${data.editedBy}`);
      }
    };

    // Set connection status based on current state
    setConnectionStatus(wsService.isConnected() ? 'connected' : 'connecting');

    // Add event listeners
    wsService.addConnectionListener(handleConnection);
    wsService.addDisconnectionListener(handleDisconnection);
    wsService.addErrorListener(handleError);

    // Store subscription reference for cleanup
    messageSubscriptionRef.current = wsService.subscribe('*', handleMessage);

    // Ensure we're connected
    wsService.connect(token).catch((error: any) => {
      console.error('Failed to connect to WebSocket:', error);
      setConnectionStatus('disconnected');
    });

    return () => {
      wsService.removeConnectionListener(handleConnection);
      wsService.removeDisconnectionListener(handleDisconnection);
      wsService.removeErrorListener(handleError);

      // Unsubscribe from messages
      if (messageSubscriptionRef.current) {
        wsService.unsubscribe(messageSubscriptionRef.current);
        messageSubscriptionRef.current = null;
      }

      // Clear any message retry timeouts
      pendingMessages.forEach(info => {
        if (info.timeout) {
          window.clearTimeout(info.timeout as unknown as number);
        }
      });
    };
  }, [
    fetchMessages,
    pendingMessages,
    selection,
    sendJoinMessage,
    token,
    username,
    wsService,
    messages
  ]);

  // Setup cleanup on unmount
  useEffect(() => {
    isMounted.current = true;

    // Setup heartbeat
    heartbeatInterval.current = wsService.setupHeartbeat(30000) as unknown as number;

    return () => {
      isMounted.current = false;
      clearHeartbeat();

      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
        typingTimeout.current = null;
      }
    };
  }, [wsService]);

  // Handle channel/DM switching
  useEffect(() => {
    // When no selection is made, immediately clear messages
    if (!selection) {
      setMessages([]);
      setHasMoreMessages(false);
      setOldestMessageId(null);
      setIsLoadingHistory(false);
      setInitialLoadDone(false);
      setTypingIndicator(null);
      return;
    }

    if (!wsService.isConnected()) return;

    const prevSelection = currentSelection.current;
    currentSelection.current = selection;

    if (!prevSelection) {
      // First selection, send join and fetch messages
      sendJoinMessage(selection);
      fetchMessages();
      return;
    }

    const hasSelectionChanged =
      prevSelection.type !== selection.type ||
      prevSelection.teamName !== selection.teamName ||
      (selection.type === 'channel' &&
        prevSelection.type === 'channel' &&
        prevSelection.channelName !== selection.channelName) ||
      (selection.type === 'directMessage' &&
        prevSelection.type === 'directMessage' &&
        prevSelection.username !== selection.username);

    if (hasSelectionChanged) {
      console.log('Selection changed, sending join message');
      sendJoinMessage(selection);

      // Reset typing indicator when changing conversations
      setTypingIndicator(null);
      if (isTyping) {
        setIsTyping(false);
        if (typingTimeout.current) {
          clearTimeout(typingTimeout.current);
          typingTimeout.current = null;
        }
      }

      // Reset pagination state
      setHasMoreMessages(false);
      setOldestMessageId(null);
      setIsLoadingHistory(false);
      setInitialLoadDone(false);
      setMessages([]); // Clear messages when switching channels

      // Clear the processed message IDs set when changing selection
      processedMessageIds.current = new Set();

      // Fetch new messages
      fetchMessages();
    }
  }, [isTyping, selection, sendJoinMessage, fetchMessages, wsService]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selection) return;

    // Debug info
    console.log(`File upload triggered. ${files.length} file(s) selected.`);

    Array.from(files).forEach(file => {
      // Log file details
      console.log('Processing file:', {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024).toFixed(2)} KB`
      });

      const reader = new FileReader();

      reader.onload = () => {
        const base64Content = reader.result as string;

        // Simple file size check (client-side validation)
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          alert(`File ${file.name} is too large. Maximum size is 10MB.`);
          return;
        }

        console.log('File read successfully, creating message');
        console.log(`Base64 content length: ${base64Content.length} characters`);

        // Create a unique identifier for this file upload
        const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        // Create message with file data
        const mediaMessage: WebSocketMessage = {
          type: selection.type === 'directMessage' ? 'directMessage' : 'message',
          text: `[File] ${file.name}`, // Text indicates this is a file message
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileData: base64Content,
          teamName: selection.teamName,
          uploadId, // Track the upload
          ...(selection.type === 'directMessage'
            ? { receiverUsername: selection.username }
            : { channelName: selection.channelName }),
          fileUrl: '' // Placeholder for server to fill in
        };

        console.log(`Sending file message with uploadId: ${uploadId}`, {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          messageType: mediaMessage.type,
          teamName: selection.teamName,
          // Don't log the full base64 content as it's too large
          fileDataLength: base64Content.length
        });

        // Track the start time of the upload
        const startTime = performance.now();

        // Send the message and get the client ID
        const clientMessageId = sendMessage(mediaMessage);

        console.log(`File message sent with clientMessageId: ${clientMessageId}`);

        // Register a callback to track when the server acknowledges the message
        wsService.registerMessageStatusCallback(clientMessageId, (status) => {
          const endTime = performance.now();
          const duration = (endTime - startTime) / 1000; // seconds

          console.log(`Upload ${uploadId} ${status} in ${duration.toFixed(2)}s`, {
            clientMessageId,
            fileName: file.name,
            fileSize: file.size,
            status
          });
        });
      };

      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        alert(`Failed to read file ${file.name}`);
      };

      // Start reading the file as data URL (which gives us the base64 encoding)
      reader.readAsDataURL(file);
    });

    // Clear the file input after processing
    e.target.value = '';
  };

  const handleQuoteMessage = () => {
    if (!contextMenu.selected) {
      console.warn('No message selected for quoting.');
      return;
    }

    const messageToQuote = messages.find(msg => msg._id === contextMenu.selected);
    if (!messageToQuote) {
      console.warn('Selected message not found in the current message list.');
      return;
    }

    if (!messageToQuote.text || messageToQuote.text.trim() === '') {
      console.warn('Cannot quote an empty or non-text message.');
      return;
    }

    setQuotedMessage({
      _id: messageToQuote._id,
      text: messageToQuote.text,
      username: messageToQuote.username
    });

    // Focus on input field after quoting
    const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement | null;
    if (inputElement) {
      inputElement.focus();
    } else {
      console.warn('Input field not found for focusing.');
    }

    // Close context menu
    setContextMenu({ visible: false, x: 0, y: 0, selected: '' });
  };

  const cancelQuote = () => {
    if (!quotedMessage) {
      console.warn('No quoted message to cancel.');
      return;
    }

    setQuotedMessage(null);
  };

  const menuItems = [{ label: 'Quote Message', onClick: () => handleQuoteMessage() }, { label: 'Delete Message', onClick: handleDeleteMessage }];

  const QuotedMessagePreview = ({ quotedMessage, onCancel }: { quotedMessage: QuotedMessage, onCancel: () => void }) => (
    <div style={{
      padding: '8px 12px',
      marginBottom: '8px',
      borderLeft: '3px solid #4682B4',
      backgroundColor: theme === 'dark' ? '#383838' : '#f0f0f0',
      borderRadius: '4px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
          Replying to {quotedMessage.username}
        </div>
        <div style={{
          fontSize: '13px',
          color: theme === 'dark' ? '#ccc' : '#555',
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          maxWidth: '300px'
        }}>
          {quotedMessage.text}
        </div>
      </div>
      <button
        onClick={onCancel}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
          color: theme === 'dark' ? '#ccc' : '#666'
        }}
      >
        ×
      </button>
    </div>
  );

  // Add a component to render quoted content in messages
  const QuotedContent = ({ quotedMessage }: { quotedMessage: QuotedMessage }) => (
    <div style={{
      padding: '6px 10px',
      marginBottom: '6px',
      borderLeft: '2px solid #4682B4',
      backgroundColor: theme === 'dark' ? 'rgba(56, 56, 56, 0.5)' : 'rgba(240, 240, 240, 0.5)',
      borderRadius: '4px',
      fontSize: '13px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
        {quotedMessage.username}
      </div>
      <div style={{ color: theme === 'dark' ? '#ccc' : '#555' }}>
        {quotedMessage.text}
      </div>
    </div>
  );

  return (
    <div style={getStyledComponent(styles.teamMessages)}>
      <div style={getStyledComponent(styles.chatHeader)}>
        {getSelectionTitle()}
        <div style={{ fontSize: '12px', marginLeft: '8px' }}>
          {connectionStatus === 'connected'
            ? '🟢 Connected'
            : connectionStatus === 'connecting'
              ? '🟠 Connecting...'
              : '🔴 Disconnected'}
        </div>
      </div>

      <div style={getStyledComponent(styles.chatBox)} ref={chatBoxRef}>
        {/* Loading older messages indicator */}
        {isLoadingHistory && (
          <div
            style={{
              textAlign: 'center',
              padding: '10px',
              fontSize: '14px',
              color: theme === 'dark' ? '#aaa' : '#666'
            }}
          >
            Loading messages...
          </div>
        )}

        {/* Load more messages button */}
        {hasMoreMessages && !isLoadingHistory && (
          <div
            style={{
              textAlign: 'center',
              padding: '10px',
              marginBottom: '5px'
            }}
          >
            <button
              onClick={loadOlderMessages}
              style={{
                background: theme === 'dark' ? '#444' : '#eee',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                cursor: 'pointer',
                color: theme === 'dark' ? '#fff' : '#333',
                fontSize: '13px'
              }}
            >
              Load older messages
            </button>
          </div>
        )}

        {/* No messages placeholder */}
        {messages.length === 0 && !isLoadingHistory && initialLoadDone ? (
          <p style={getStyledComponent(styles.chatPlaceholder)}>
            {selection ? 'No messages yet. Say hello!' : 'Select a channel or user to chat with.'}
          </p>
        ) : (
          /* Message list */
          // Fixed message mapping with proper file URL handling
          messages.map(msg => {
            // Check if this is a file message
            const isFileAttachment = !!(msg.fileName && msg.fileType && (msg.status === 'pending' || msg.fileUrl || msg.fileUrl === ''));

            console.log(`Message ${msg._id || msg.clientMessageId || 'unknown'} isFileMessage:`, isFileAttachment, {
              fileName: msg.fileName,
              fileType: msg.fileType,
              fileUrl: msg.fileUrl,
              status: msg.status,
              text: msg.text,
              createdAt: msg.createdAt,
              username: msg.username,
              clientMessageId: msg.clientMessageId,
              ...(msg.quotedMessage && {
                quotedMessage: {
                  _id: msg.quotedMessage._id,
                  text: msg.quotedMessage.text,
                  username: msg.quotedMessage.username
                }
              })
            });

            let fileInfo: {
              fileName: string | undefined;
              fileType: string | undefined;
              fileUrl: string;
              fileSize: number | undefined;
              uploadStatus: 'pending' | 'completed' | 'error';
            } | null = null;

            if (isFileAttachment) {
              const uploadStatus =
                msg.status === 'failed' ? 'error' :
                  (!msg.fileUrl || msg.fileUrl === '') ? 'pending' : 'completed';

              fileInfo = {
                fileName: msg.fileName,
                fileType: msg.fileType,
                fileUrl: msg.fileUrl || '',
                fileSize: msg.fileSize,
                uploadStatus
              };

              console.log('File attachment will be rendered with:', {
                ...fileInfo,
                uploadStatus
              });
            }

            return (
              <div
                key={
                  msg._id ||
                  msg.clientMessageId ||
                  (msg.createdAt ? msg.createdAt.getTime() : Date.now() + Math.random())
                }
                onContextMenu={e => handleContextMenu(e, msg._id)}
                style={
                  {
                    ...getStyledComponent(styles.chatMessage),
                    alignSelf: msg.username === username ? 'flex-end' : 'flex-start',
                    backgroundColor:
                      msg.username === username
                        ? theme === 'dark'
                          ? '#2b5278'
                          : '#DCF8C6'
                        : theme === 'dark'
                          ? '#383838'
                          : '#FFF',
                    opacity: msg.status === 'failed' ? 0.7 : 1,
                    padding: '10px',
                    margin: '5px 0',
                    borderRadius: '8px',
                    maxWidth: '80%',
                    wordBreak: 'break-word'
                  } as React.CSSProperties
                }
              >
                <div>
                  <strong>{msg.username}</strong>:{' '}

                  {/* Render quoted message if it exists */}
                  {msg.quotedMessage && (
                    <QuotedContent quotedMessage={msg.quotedMessage} />
                  )}

                  {/* Show message text content if it's not a file-only message
            or if it has additional text content */}
                  {(!isFileAttachment || (isFileAttachment && !msg.text?.startsWith('[File]'))) && (
                    <span>{msg.text}</span>
                  )}

                  {/* Render file attachment if we have file info */}
                  {isFileAttachment && fileInfo && (
                    <FileAttachment
                      fileName={fileInfo.fileName || 'Unknown File'}
                      fileType={fileInfo.fileType || ''}
                      fileUrl={fileInfo.fileUrl}
                      fileSize={fileInfo.fileSize}
                      uploadStatus={fileInfo.uploadStatus}
                      messageId={msg._id}
                      editedBy={msg.editedBy}
                      editedAt={msg.editedAt}
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
                    <span>{msg.createdAt ? msg.createdAt.toLocaleString() : 'Unknown Date'}</span>

                    {msg.username === username && (
                      <MessageStatusIndicator status={msg.status} dark={theme === 'dark'} />
                    )}
                  </div>

                  {msg.status === 'failed' && (
                    <button
                      onClick={() => handleResendMessage(msg)}
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
          }))}

        {/* Typing indicator */}
        {typingIndicator?.isTyping && (
          <div
            style={{
              padding: '8px 12px',
              margin: '4px 0',
              fontSize: '14px',
              color: theme === 'dark' ? '#ccc' : '#555',
              fontStyle: 'italic'
            }}
          >
            {typingIndicator.username} is typing...
          </div>
        )}
      </div>

      <div style={getStyledComponent(styles.inputBox)}>
        {/* Quoted message preview */}
        {quotedMessage && (
          <div style={{ width: '100%', paddingBottom: '5px' }}>
            <QuotedMessagePreview quotedMessage={quotedMessage} onCancel={cancelQuote} />
          </div>
        )}
        {/* Message input */}
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={handleInputChange}
          onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
          style={getStyledComponent(styles.inputField)}
          disabled={connectionStatus !== 'connected' || !selection}
        />

        {/* Upload icon with hidden input */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type="file"
            multiple
            accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
            style={{ display: 'none' }}
            id="fileUpload"
            onChange={handleFileUpload}
          />
          <label htmlFor="fileUpload" style={getStyledComponent(styles.uploadButton)}>
            📎
          </label>
        </div>

        {/* Emoji button */}
        <button
          onClick={() => setShowEmojiPicker(prev => !prev)}
          style={getStyledComponent(styles.emojiButton)}
        >
          &#128512;
        </button>

        {/* Send button */}
        <button
          onClick={handleSendMessage}
          style={{
            ...getStyledComponent(styles.sendButton),
            ...((connectionStatus !== 'connected' || !selection) && {
              opacity: 0.5,
              cursor: 'not-allowed'
            })
          }}
          disabled={connectionStatus !== 'connected' || !selection}
        >
          Send
        </button>
      </div>

      {showEmojiPicker && (
        <div style={getStyledComponent(styles.emojiPickerContainer)}>
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}

      {contextMenu.visible && (
        <ContextMenu
          items={menuItems}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
};

export default Messaging;

import React, { useEffect, useState, useRef, useCallback } from "react";
import styles from "../Styles/dashboardStyles";
import { deleteMessage } from "../Services/channelService";
import { jwtDecode } from "jwt-decode";
import ContextMenu from "./UI/ContextMenu";
import { useTheme } from "../Context/ThemeContext";
import UserStatusIndicator from "./UI/UserStatusIndicator";
import MessageStatusIndicator from "./UI/MessageStatusIndicator";
import WebSocketClient from "../Services/webSocketClient";
import { 
  Selection, 
  ContextMenuState, 
  ChatMessage, 
  WebSocketMessage,
  RetryInfo,
  MessageStatus,
} from "../types/shared";

// Constants for message retry
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 3000;

interface MessagingProps {
  selection: Selection | null;
  contextMenu: ContextMenuState;
  setContextMenu: (arg: ContextMenuState) => void;
}

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

const Messaging: React.FC<MessagingProps> = ({ 
  selection,
  contextMenu, 
  setContextMenu
}) => {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState<string>("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [typingIndicator, setTypingIndicator] = useState<{username: string, isTyping: boolean} | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<Map<string, RetryInfo>>(new Map());
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [oldestMessageId, setOldestMessageId] = useState<string | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  // Refs
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
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
  const token = localStorage.getItem("token");
  const username = token ? jwtDecode<any>(token).username : "";

  // Helper functions
  const getSelectionTitle = () => {
    if (!selection) return "No selection";
    
    if (selection.type === 'channel') {
      return `Channel: ${selection.channelName}`;
    } else {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Direct Messages with {selection.username || "Unknown User"}</span>
          <UserStatusIndicator 
            username={selection.username || "Unknown User"} 
            showStatusText={true} 
            size="medium"
          />
        </div>
      );
    }
  };

  const getStyledComponent = useCallback((baseStyle: any) => ({
    ...baseStyle,
    ...(theme === "dark" && baseStyle["&.dark-mode"])
  }), [theme]);

  const clearHeartbeat = () => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  };

  const sendTypingStatus = (isTyping: boolean) => {
    if (!wsService.isConnected() || !selection) return;
    
    const typingMessage: WebSocketMessage = selection.type === 'channel' 
      ? { 
          type: "typing", 
          isTyping, 
          username,
          teamName: selection.teamName, 
          channelName: selection.channelName 
        }
      : { 
          type: "typing", 
          isTyping, 
          username,
          teamName: selection.teamName, 
          receiverUsername: selection.username
        };
        
    wsService.send(typingMessage);
  };

  // Function to track pending messages and handle retries
  const trackPendingMessage = useCallback((messageData: WebSocketMessage, clientMessageId: string) => {
    // Create a timeout for retry
    const timeout = setTimeout(() => {
      setPendingMessages(prev => {
        const pending = prev.get(clientMessageId);
        
        if (pending && pending.attempts < MAX_RETRY_ATTEMPTS) {
          // Retry sending
          console.log(`Retrying message ${clientMessageId}, attempt ${pending.attempts + 1}`);
          
          // Attempt to resend
          if (wsService.isConnected()) {
            wsService.send(messageData);
          }
          
          // Update retry info
          const updated = new Map(prev);
          updated.set(clientMessageId, {
            message: messageData,
            attempts: pending.attempts + 1,
            timeout: setTimeout(() => trackPendingMessage(messageData, clientMessageId), RETRY_DELAY_MS),
            createdAt: messageData.createdAt || Date.now()
          });
          return updated;
        } else {
          // Max retries reached, mark as failed
          setMessages(prevMsgs => 
            prevMsgs.map(msg => 
              msg.clientMessageId === clientMessageId 
                ? { ...msg, status: 'failed' } 
                : msg
            )
          );
          
          // Remove from pending
          const updated = new Map(prev);
          updated.delete(clientMessageId);
          return updated;
        }
      });
    }, RETRY_DELAY_MS);
    
    // Store retry info
    setPendingMessages(prev => {
      const updated = new Map(prev);
      updated.set(clientMessageId, { 
        message: messageData, 
        attempts: 0, 
        timeout,
        createdAt: messageData.createdAt || Date.now()
      });
      return updated;
    });
  }, [wsService]);

  // Sending messages with client-side tracking
  const sendMessage = useCallback((messageData: WebSocketMessage) => {
    // Generate a client-side ID for tracking
    const clientMessageId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageWithId: WebSocketMessage = { 
      ...messageData, 
      clientMessageId,
      text: messageData.text || ''
    };
    
    if (wsService.isConnected()) {
      wsService.send(messageWithId);
      
      // Register for status updates
      wsService.registerMessageStatusCallback(clientMessageId, (status) => {
        setMessages(prevMsgs => 
          prevMsgs.map(msg => 
            msg.clientMessageId === clientMessageId 
              ? { ...msg, status: status as MessageStatus } 
              : msg
          )
        );
      });
      
      // Add message to state immediately with pending status
      const newMessage: ChatMessage = {
        _id: '', // Server will assign a real ID
        text: messageWithId.text || '',
        username,
        createdAt: new Date(),
        status: 'pending',
        clientMessageId
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      return true;
    } else {
      // Add message to state with pending status
      const newMessage: ChatMessage = {
        _id: '',
        text: messageWithId.text || '',
        username,
        createdAt: new Date(),
        status: 'pending',
        clientMessageId
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // This will be queued by the service
      wsService.send(messageWithId);
      
      return false;
    }
  }, [username, wsService]);

  // Function to handle message resend
  const handleResendMessage = useCallback((message: ChatMessage) => {
    // Create a new message based on the failed one
    const newMessage: WebSocketMessage = {
      type: selection?.type === 'directMessage' ? 'directMessage' : 'message',
      text: message.text,
      username,
      teamName: selection?.teamName || '',
      ...(selection?.type === 'directMessage' 
                ? { receiverUsername: selection?.username || '' }
                : { channelName: selection?.channelName || '' }),
    };

    // Remove the failed message
    setMessages(prev => prev.filter(msg => 
      (msg._id && msg._id !== message._id) || 
      (msg.clientMessageId && msg.clientMessageId !== message.clientMessageId)
    ));
    
    // Send the new message
    sendMessage(newMessage);
  }, [selection, sendMessage, username]);

  // Function to load older messages
  const loadOlderMessages = useCallback(() => {
    if (!wsService.isConnected() || !selection || isLoadingHistory || !hasMoreMessages) {
      return;
    }
    
    setIsLoadingHistory(true);
    
    const historyRequest: WebSocketMessage = selection.type === 'channel'
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

  const sendJoinMessage = useCallback((sel: Selection) => {
    if (!wsService.isConnected() || !sel) return;

    const joinMessage: WebSocketMessage = sel.type === 'channel'
      ? { 
          type: "join", 
          teamName: sel.teamName, 
          channelName: sel.channelName 
        }
      : { 
          type: "joinDirectMessage", 
          teamName: sel.teamName, 
          username: sel.username 
        };
        
    wsService.send(joinMessage);
  }, [wsService]);

  const handleSendMessage = () => {
    if (!message.trim() || !selection) return;
    else if (message.length > 500) {
      alert("Message too long, max 500 characters allowed");
      return;
    }
    
    const newMessage: WebSocketMessage = selection.type === 'directMessage' 
      ? { 
          type: 'directMessage', 
          text: message, 
          teamName: selection.teamName,
          receiverUsername: selection.username // Changed from username to receiverUsername
        }
      : { 
          type: 'message', 
          text: message, 
          username, 
          teamName: selection.teamName, 
          channelName: selection.channelName,
        };
  
    sendMessage(newMessage);
    setMessage("");
    
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
    
    const historyRequest: WebSocketMessage = selection.type === 'channel'
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
      // This uses HTTP, but deletion is admin functionality that doesn't need real-time updates
      if (contextMenu.selected && selection.type === 'channel' && selection.channelName) {
        await deleteMessage(selection.teamName, selection.channelName, contextMenu.selected);
      } else {
        console.error("No message selected for deletion.");
      }
      setMessages(prev => prev.filter(msg => msg._id !== contextMenu.selected));
      setContextMenu({ visible: false, x: 0, y: 0, selected: "" });
    } catch (err) {
      console.error("Failed to delete message", err);
    }
  };

  const handleContextMenu = (event: React.MouseEvent, messageId: string) => {
    event.preventDefault();
    setContextMenu({ visible: true, x: event.clientX, y: event.clientY, selected: messageId });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, selected: "" });
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
      // Enhanced message deduplication - check both _id and clientMessageId
      const isDuplicate = (messageData: any): boolean => {
        // Check if we've already processed this message ID
        if (messageData._id && processedMessageIds.current.has(messageData._id)) {
          return true;
        }
        
        // Check if it's a message we sent that's already in our state
        if (messageData.clientMessageId && messages.some(
          msg => msg.clientMessageId === messageData.clientMessageId
        )) {
          return true;
        }
        
        // Mark as processed
        if (messageData._id) {
          processedMessageIds.current.add(messageData._id);
        }
        
        return false;
      };
      
      if (data.type === "message" || data.type === "directMessage") {
        // Avoid duplicates
        if (isDuplicate(data)) {
          return;
        }
        
        // Check if this is a message we sent (by comparing usernames)
        if (data.username === username) {
          // Find pending message by matching text/content
          const pendingMessage = messages.find(msg => 
            msg.status === 'pending' && 
            msg.text === data.text && 
            msg.username === data.username
          );
          
          if (pendingMessage) {
            // Update message status to sent
            setMessages(prev => 
              prev.map(msg => 
                msg === pendingMessage
                  ? { ...msg, _id: data._id ?? 'unknown-id', status: 'sent' } 
                  : msg
              )
            );
          } else {
            // This is a new message from us (maybe from another client)
            setMessages(prev => [
              ...prev, 
              {
                _id: data._id ?? 'unknown-id',
                text: data.text || '',
                username: data.username || '',
                createdAt: new Date(data.createdAt || new Date()),
                status: 'sent'
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
              _id: data._id ?? 'unknown-id',
              text: data.text || '',
              username: data.username || '',
              createdAt: new Date(data.createdAt || new Date()),
              status: 'delivered'
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
      }
      else if (data.type === "messageAck") {
        // Update message status based on acknowledgment
        setMessages(prev => 
          prev.map(msg => 
            msg._id === data.messageId 
              ? { ...msg, status: data.status } 
              : msg
          )
        );
      }
      else if (data.type === "historyResponse") {
        setIsLoadingHistory(false);
        setInitialLoadDone(true);
        
        // Process the messages
        const historyMessages = (data.messages || [])
          .filter((msg: any) => !isDuplicate(msg))
          .map((msg: any) => ({
            _id: msg._id,
            text: msg.text,
            username: msg.username,
            createdAt: new Date(msg.createdAt),
            status: msg.status || 'delivered',
            ...(msg.clientMessageId && { clientMessageId: msg.clientMessageId })
          }));
        
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
            ? historyMessages.reduce((oldest: { createdAt: string | number | Date; }, current: { createdAt: string | number | Date; }) => 
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
      }
      else if (data.type === "typing") {
        if (data.username !== username) {
          setTypingIndicator({
            username: data.username || '',
            isTyping: data.isTyping || false
          });
          
          // Clear typing indicator after 5 seconds if no update is received
          if (data.isTyping) {
            setTimeout(() => {
              setTypingIndicator(current => 
                current?.username === data.username ? null : current
              );
            }, 5000);
          } else {
            setTypingIndicator(null);
          }
        }
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
      console.error("Failed to connect to WebSocket:", error);
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
          clearTimeout(info.timeout);
        }
      });
    };
  }, [fetchMessages, pendingMessages, selection, sendJoinMessage, token, username, wsService, messages]);

  // Setup cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    
    // Setup heartbeat
    heartbeatInterval.current = wsService.setupHeartbeat(30000);
    
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
    if (!selection || !wsService.isConnected()) return;
    
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
      console.log("Selection changed, sending join message");
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

  const menuItems = [
    { label: 'Delete Message', onClick: handleDeleteMessage },
  ];

  return (
    <div style={getStyledComponent(styles.teamMessages)}>
      <div style={getStyledComponent(styles.chatHeader)}>
        {getSelectionTitle()}
        <div style={{ fontSize: '12px', marginLeft: '8px' }}>
          {connectionStatus === 'connected' ? '🟢 Connected' : 
           connectionStatus === 'connecting' ? '🟠 Connecting...' : 
           '🔴 Disconnected'}
        </div>
      </div>
      
      <div 
        style={getStyledComponent(styles.chatBox)}
        ref={chatBoxRef}
      >
        {/* Loading older messages indicator */}
        {isLoadingHistory && (
          <div style={{
            textAlign: 'center',
            padding: '10px',
            fontSize: '14px',
            color: theme === 'dark' ? '#aaa' : '#666'
          }}>
            Loading messages...
          </div>
        )}
        
        {/* Load more messages button */}
        {hasMoreMessages && !isLoadingHistory && (
          <div style={{
            textAlign: 'center',
            padding: '10px',
            marginBottom: '5px'
          }}>
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
            {selection ? "No messages yet. Say hello!" : "Select a channel or user to chat with."}
          </p>
        ) : (
          /* Message list */
          messages.map((msg) => (
            <div
              key={msg._id || msg.clientMessageId || (msg.createdAt ? msg.createdAt.getTime() : Date.now() + Math.random())}
              onContextMenu={e => handleContextMenu(e, msg._id)}
              style={{
                ...getStyledComponent(styles.chatMessage),
                alignSelf: msg.username === username ? "flex-end" : "flex-start",
                backgroundColor: msg.username === username ? 
                  (theme === 'dark' ? '#2b5278' : '#DCF8C6') : 
                  (theme === 'dark' ? '#383838' : '#FFF'),
                opacity: msg.status === 'failed' ? 0.7 : 1,
              } as React.CSSProperties}
            >
              <div>
                <strong>{msg.username}</strong>: {msg.text}
                <div style={{ 
                  fontSize: '11px', 
                  marginTop: '3px', 
                  color: theme === 'dark' ? '#aaa' : '#777',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>
                    {msg.createdAt ? msg.createdAt.toLocaleString() : "Unknown Date"}
                  </span>
                  
                  {/* Message status indicator for sent messages */}
                  {msg.username === username && (
                    <MessageStatusIndicator 
                      status={msg.status} 
                      dark={theme === 'dark'}
                    />
                  )}
                </div>
                
                {/* Retry button for failed messages */}
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
                      fontSize: '12px',
                    }}
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        
        {/* Typing indicator */}
        {typingIndicator?.isTyping && (
          <div style={{
            padding: '8px 12px',
            margin: '4px 0',
            fontSize: '14px',
            color: theme === 'dark' ? '#ccc' : '#555',
            fontStyle: 'italic'
          }}>
            {typingIndicator.username} is typing...
          </div>
        )}
      </div>
      
      <div style={getStyledComponent(styles.inputBox)}>
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          style={getStyledComponent(styles.inputField)}
          disabled={connectionStatus !== 'connected' || !selection}
        />
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
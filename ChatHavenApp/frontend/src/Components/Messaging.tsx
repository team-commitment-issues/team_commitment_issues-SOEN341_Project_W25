import React, { useEffect, useState, useRef, useCallback } from "react";
import styles from "../Styles/dashboardStyles";
import { deleteMessage } from "../Services/channelService";
import { jwtDecode } from "jwt-decode";
import ContextMenu from "./UI/ContextMenu";
import { useTheme } from "../Context/ThemeContext";
import { useOnlineStatus } from "../Context/OnlineStatusContext";
import UserStatusIndicator from "./UI/UserStatusIndicator";
import MessageStatusIndicator from "./UI/MessageStatusIndicator";
import { 
  Selection, 
  ContextMenuState, 
  ChatMessage, 
  WebSocketMessage,
  RetryInfo,
  Status
} from "../types/shared";

const MAX_RETRY_COUNT = 5;
const BASE_RETRY_MS = 1000;
const HEARTBEAT_INTERVAL_MS = 30000;

// Constants for message retry
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 3000;

interface MessagingProps {
  selection: Selection;
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
  const [retryCount, setRetryCount] = useState(0);
  const [messageQueue, setMessageQueue] = useState<WebSocketMessage[]>([]);
  const [typingIndicator, setTypingIndicator] = useState<{username: string, isTyping: boolean} | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<Map<string, RetryInfo>>(new Map());
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [oldestMessageId, setOldestMessageId] = useState<string | null>(null);
  
  // Refs
  const ws = useRef<WebSocket | null>(null);
  const isMounted = useRef(true);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const currentSelection = useRef<Selection | null>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const lastScrollHeight = useRef<number>(0);
  const scrollPositionRef = useRef<number>(0);
  
  const { theme } = useTheme();
  const { updateUserStatus } = useOnlineStatus();
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
          <span>Direct Messages with {selection.username}</span>
          <UserStatusIndicator 
            username={selection.username} 
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
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN || !selection) return;
    
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
        
    ws.current.send(JSON.stringify(typingMessage));
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
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(messageData));
          }
          
          // Update retry info
          const updated = new Map(prev);
          updated.set(clientMessageId, {
            message: messageData,
            attempts: pending.attempts + 1,
            timeout: setTimeout(() => trackPendingMessage(messageData, clientMessageId), RETRY_DELAY_MS)
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
        timeout 
      });
      return updated;
    });
  }, []);

  // Enhanced sendMessage function with client-side tracking
  const sendMessage = useCallback((messageData: WebSocketMessage) => {
    // Generate a client-side ID for tracking
    const clientMessageId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageWithId = { 
      ...messageData, 
      clientMessageId 
    };
    
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(messageWithId));
      
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
      
      // Track for potential retry
      trackPendingMessage(messageWithId, clientMessageId);
      
      return true;
    } else {
      // Queue message for sending when connection is restored
      setMessageQueue(prev => [...prev, messageWithId]);
      
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
      
      return false;
    }
  }, [username, trackPendingMessage]);

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
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN || !selection || isLoadingHistory || !hasMoreMessages) {
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
        
    ws.current.send(JSON.stringify(historyRequest));
    
    // Store current scroll position for restoration
    if (chatBoxRef.current) {
      lastScrollHeight.current = chatBoxRef.current.scrollHeight;
      scrollPositionRef.current = chatBoxRef.current.scrollTop;
    }
  }, [selection, isLoadingHistory, hasMoreMessages, oldestMessageId]);

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

  const connectWebSocket = useCallback(() => {
    if (!token || !selection) return;

    if (ws.current) {
      ws.current.close(1000, "Creating new connection");
      ws.current = null;
    }

    setConnectionStatus('connecting');
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = process.env.REACT_APP_WS_HOST || window.location.host;
    ws.current = new WebSocket(`${wsProtocol}//${wsHost}/ws?token=${token}`);

    ws.current.onopen = () => {
      if (!isMounted.current) return;
      
      console.log("WebSocket connection established");
      setConnectionStatus('connected');
      setRetryCount(0);
      
      // Set up heartbeat
      clearHeartbeat();
      heartbeatInterval.current = setInterval(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          const pingMessage: WebSocketMessage = { 
            type: "ping"
          };
          ws.current.send(JSON.stringify(pingMessage));
        }
      }, HEARTBEAT_INTERVAL_MS);
      
      sendJoinMessage(selection);
      
      if (messageQueue.length > 0) {
        messageQueue.forEach(msg => ws.current?.send(JSON.stringify(msg)));
        setMessageQueue([]);
      }
    };

    ws.current.onmessage = (event) => {
      if (!isMounted.current) return;
      
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        
        switch (data.type) {
          case "message":
          case "directMessage":
            // Check if this is a message we sent (has a clientMessageId)
            const messageClientId = data.clientMessageId;
            
            if (messageClientId) {
              // This is a confirmation of our sent message
              // Clear any pending retry for this message
              const pending = pendingMessages.get(messageClientId);
              if (pending?.timeout) {
                clearTimeout(pending.timeout);
              }
              
              setPendingMessages(prev => {
                const updated = new Map(prev);
                updated.delete(messageClientId);
                return updated;
              });
              
              // Update message status to sent
              setMessages(prev => 
                prev.map(msg => 
                  msg.clientMessageId === messageClientId 
                    ? { ...msg, _id: data._id ?? 'unknown-id', status: 'sent' } 
                    : msg
                )
              );
              
              // Send delivery acknowledgment
              if (ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({
                  type: 'messageAck',
                  messageId: data._id,
                  status: 'delivered'
                }));
              }
            } else {
              // This is a message from someone else
              // Check if we already have this message to avoid duplicates
              if (messages.some(msg => msg._id === data._id)) {
                return;
              }
              
              // Add to messages
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
              if (ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({
                  type: 'messageAck',
                  messageId: data._id,
                  status: 'read'
                }));
              }
            }
            break;
            
          case "messageAck":
            // Update message status based on acknowledgment
            setMessages(prev => 
              prev.map(msg => 
                msg._id === data.messageId 
                  ? { ...msg, status: data.status } 
                  : msg
              )
            );
            break;
            
          case "historyResponse":
            setIsLoadingHistory(false);
            
            // Process the messages
            const historyMessages = (data.messages || []).map((msg: any) => ({
              _id: msg._id,
              text: msg.text,
              username: msg.username,
              createdAt: new Date(msg.createdAt),
              status: msg.status
            }));
            
            if (historyMessages.length > 0) {
              // Update oldest message ID for pagination
              const sortedMessages = [...historyMessages].sort(
                (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
              );
              setOldestMessageId(sortedMessages[0]._id);
              
              // Update messages state (prepend older messages)
              setMessages(prev => [...historyMessages, ...prev]);
              
              // Update hasMoreMessages flag
              setHasMoreMessages(data.hasMore ?? false);
              
              // Restore scroll position after DOM update
              setTimeout(() => {
                if (chatBoxRef.current) {
                  const newScrollHeight = chatBoxRef.current.scrollHeight;
                  const heightDifference = newScrollHeight - lastScrollHeight.current;
                  chatBoxRef.current.scrollTop = scrollPositionRef.current + heightDifference;
                }
              }, 0);
            } else {
              setHasMoreMessages(false);
            }
            break;
            
          case "typing":
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
            break;
            
          case "statusUpdate":
            updateUserStatus(
              data.username || '', 
              data.status as Status || 'offline', 
              data.lastSeen ? new Date(data.lastSeen) : undefined
            );
            break;
        }
      } catch (error) {
        console.error("Failed to parse incoming message:", error);
      }
    };

    ws.current.onclose = (event) => {
      if (!isMounted.current) return;
      
      console.log("WebSocket connection closed:", event.code, event.reason);
      setConnectionStatus('disconnected');
      ws.current = null;
      clearHeartbeat();
      
      if (event.code === 1008) {
        console.error("Authentication failed, not reconnecting");
        return;
      }

      const intentionalClosureReasons = [
        "Creating new connection",
        "Component unmounting",
        "User initiated disconnect",
        "Switching channels/DMs",
        "No selection"
      ];
      
      if (event.code === 1000 && intentionalClosureReasons.includes(event.reason)) {
        console.log("Clean WebSocket closure, no reconnection needed");
        return;
      }
      
      // Implement exponential backoff for reconnection
      if (retryCount < MAX_RETRY_COUNT) {
        const delay = Math.min(BASE_RETRY_MS * Math.pow(2, retryCount), 30000);
        setRetryCount(prev => prev + 1);
        setTimeout(connectWebSocket, delay);
      } else {
        console.error("Max reconnection attempts reached");
      }
    };

    ws.current.onerror = (error) => {
      if (!isMounted.current) return;
      console.error("WebSocket error:", error);
    };
  }, [token, selection, messageQueue, retryCount, username, updateUserStatus, messages, pendingMessages]);

  const sendJoinMessage = (sel: Selection) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN || !sel) return;

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
        
    ws.current.send(JSON.stringify(joinMessage));
  };

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
          username, 
          teamName: selection.teamName,
          receiverUsername: selection.username
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

  // Changed to use WebSocket for initial message loading
  const fetchMessages = useCallback(() => {
    if (!selection || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setMessages([]);
      setHasMoreMessages(false);
      setOldestMessageId(null);
      return;
    }
    
    setIsLoadingHistory(true);
    
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
        
    ws.current.send(JSON.stringify(historyRequest));
  }, [selection]);

  const handleDeleteMessage = async () => {
    if (!contextMenu.selected || !selection || selection.type !== 'channel') return;
    
    try {
      // This uses HTTP, but deletion is admin functionality that doesn't need real-time updates
      await deleteMessage(selection.teamName, selection.channelName, contextMenu.selected);
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
  
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      clearHeartbeat();
      
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
        typingTimeout.current = null;
      }
      
      // Clear all message retry timeouts
      pendingMessages.forEach(info => {
        if (info.timeout) {
          clearTimeout(info.timeout);
        }
      });
    };
  }, [pendingMessages]);

  useEffect(() => {
    // Only fetch messages after WebSocket connection is established
    if (selection && connectionStatus === 'connected') {
      fetchMessages();
    }
  }, [selection, connectionStatus, fetchMessages]);

  // WebSocket lifecycle management
  useEffect(() => {
    if (token && selection) {
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        connectWebSocket();
      }
    } else if (!selection && ws.current) {
      ws.current.close(1000, "No selection");
      ws.current = null;
    }
  
    return () => {
      clearHeartbeat();
      if (ws.current) {
        ws.current.close(1000, "Component unmounting");
        ws.current = null;
      }
    };
  }, [token, selection, connectWebSocket]);

  // Handle channel/DM switching with existing connection
  useEffect(() => {
    if (!selection || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    
    const prevSelection = currentSelection.current;
    currentSelection.current = selection;
    
    if (!prevSelection) return;
    
    const hasSelectionChanged = 
      prevSelection.type !== selection.type ||
      (selection.type === 'channel' && 
       prevSelection.type === 'channel' && 
       (prevSelection.teamName !== selection.teamName || 
        prevSelection.channelName !== selection.channelName)) ||
      (selection.type === 'directMessage' && 
       prevSelection.type === 'directMessage' && 
       (prevSelection.teamName !== selection.teamName || 
        prevSelection.username !== selection.username));
    
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
      setMessages([]); // Clear messages when switching channels
    }
  }, [isTyping, selection]);

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
        {messages.length === 0 && !isLoadingHistory ? (
          <p style={getStyledComponent(styles.chatPlaceholder)}>
            {selection ? "No messages yet." : "Select a channel or user to chat with."}
          </p>
        ) : (
          /* Message list */
          messages.map((msg) => (
            <div
              key={msg._id || msg.clientMessageId || msg.createdAt.getTime()}
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
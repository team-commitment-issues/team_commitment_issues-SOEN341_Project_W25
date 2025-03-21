import React, { useEffect, useState, useRef, useCallback } from "react";
import styles from "../Styles/dashboardStyles";
import { deleteMessage, getMessages } from "../Services/channelService";
import { getDirectMessages } from "../Services/directMessageService";
import { jwtDecode } from "jwt-decode";
import ContextMenu from "./UI/ContextMenu";
import { useTheme } from "../Context/ThemeContext";
import { useOnlineStatus } from "../Context/OnlineStatusContext";
import UserStatusIndicator from "./UI/UserStatusIndicator";
import { 
  Selection, 
  ContextMenuState, 
  ChatMessage, 
  WebSocketMessage,
} from "../types/shared";

const MAX_RETRY_COUNT = 5;
const BASE_RETRY_MS = 1000;
const HEARTBEAT_INTERVAL_MS = 30000;

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
  
  // Refs
  const ws = useRef<WebSocket | null>(null);
  const isMounted = useRef(true);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const currentSelection = useRef<Selection | null>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  
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
    ws.current = new WebSocket(`ws://localhost:5000?token=${token}`);

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
            type: "ping", 
            selection 
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
            setMessages((prevMessages) => {
              // Avoid duplicate messages
              if (prevMessages.some(msg => msg._id === data._id)) {
                return prevMessages;
              }
              
              return [...prevMessages, {
                _id: data._id,
                text: data.text,
                username: data.username,
                createdAt: new Date(data.createdAt),
              }];
            });
            break;
            
          case "typing":
            if (data.username !== username) {
              setTypingIndicator({
                username: data.username,
                isTyping: data.isTyping
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
              data.username, 
              data.status, 
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
  }, [token, selection, messageQueue, retryCount, username, updateUserStatus]);

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

  const sendMessage = useCallback((messageData: WebSocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(messageData));
      return true;
    } else {
      setMessageQueue(prev => [...prev, messageData]);
      return false;
    }
  }, []);

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
          receiverUsername: selection.username,
          _id: '', // Will be assigned by server
          createdAt: new Date().toISOString()
        }
      : { 
          type: 'message', 
          text: message, 
          username, 
          teamName: selection.teamName, 
          channelName: selection.channelName,
          _id: '', // Will be assigned by server
          createdAt: new Date().toISOString()
        };

    const sent = sendMessage(newMessage);
    if (sent) {
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
    }
  };

  const fetchMessages = useCallback(async () => {
    if (!selection) {
      setMessages([]);
      return;
    }

    try {
      let fetchedMessages;
      
      if (selection.type === 'directMessage') {
        const response = await getDirectMessages(selection.teamName, selection.username);
        if (!isMounted.current) return;
        fetchedMessages = response.directMessages;
      } else {
        fetchedMessages = await getMessages(selection.teamName, selection.channelName);
        if (!isMounted.current) return;
      }
      
      setMessages(fetchedMessages.map((msg: any) => ({
        _id: msg._id,
        text: msg.text,
        username: msg.username,
        createdAt: new Date(msg.createdAt),
      })));
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  }, [selection]);

  const handleDeleteMessage = async () => {
    if (!contextMenu.selected || !selection || selection.type !== 'channel') return;
    
    try {
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
  
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      clearHeartbeat();
      
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
        typingTimeout.current = null;
      }
    };
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

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
      
      <div style={getStyledComponent(styles.chatBox)}>
        {messages.length === 0 ? (
          <p style={getStyledComponent(styles.chatPlaceholder)}>
            {selection ? "No messages yet." : "Select a channel or user to chat with."}
          </p>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              onContextMenu={e => handleContextMenu(e, msg._id)}
              style={{
                ...getStyledComponent(styles.chatMessage),
                alignSelf: msg.username === username ? "flex-end" : "flex-start",
                backgroundColor: msg.username === username ? "#DCF8C6" : "#FFF",
              } as React.CSSProperties}
            >
              <div>
                <strong>{msg.username}</strong>: {msg.text} 
                <em>({msg.createdAt ? msg.createdAt.toLocaleString() : "Unknown Date"})</em>
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
            color: '#555',
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
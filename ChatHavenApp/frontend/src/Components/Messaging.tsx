import React, { useEffect, useState, useRef, useCallback } from "react";
import styles from "../Styles/dashboardStyles";
import { deleteMessage, getMessages } from "../Services/channelService";
import { getDirectMessages } from "../Services/directMessageService";
import { jwtDecode } from "jwt-decode";
import ContextMenu from "./UI/ContextMenu";
import { useTheme } from "../Context/ThemeContext";
import { Selection, ContextMenuState, ChatMessage } from "../types/shared";

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
  const [messageQueue, setMessageQueue] = useState<any[]>([]);
  
  // Refs
  const ws = useRef<WebSocket | null>(null);
  const isMounted = useRef(true);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const currentSelection = useRef<Selection | null>(null);
  
  const { theme } = useTheme();
  const token = localStorage.getItem("token");
  const username = token ? (jwtDecode<any>(token)).username : "";

  const getSelectionTitle = () => {
    if (!selection) return "No selection";
    
    if (selection.type === 'channel') {
      return `Channel: ${selection.channelName}`;
    } else {
      return `Direct Messages with ${selection.username}`;
    }
  };

  // WebSocket functionality
  const connectWebSocket = useCallback(() => {
    if (!token) {
      console.error("No token available");
      return;
    }

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
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      
      heartbeatInterval.current = setInterval(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ 
            type: "ping", 
            selection: selection
          }));
        }
      }, HEARTBEAT_INTERVAL_MS);
      
      // Join appropriate channel/DM based on selection
      if (selection) {
        if (selection.type === 'channel') {
          ws.current?.send(JSON.stringify({ 
            type: "join", 
            teamName: selection.teamName, 
            channelName: selection.channelName 
          }));
        } else {
          ws.current?.send(JSON.stringify({ 
            type: "joinDirectMessage", 
            teamName: selection.teamName, 
            username: selection.username 
          }));
        }
      }
      
      // Send queued messages
      if (messageQueue.length > 0) {
        messageQueue.forEach(msg => {
          ws.current?.send(JSON.stringify(msg));
        });
        setMessageQueue([]);
      }
    };

    ws.current.onmessage = (event) => {
      if (!isMounted.current) return;
      
      try {
        const newMessage = JSON.parse(event.data);
        if (newMessage.type === "message" || newMessage.type === "directMessage") {
          setMessages((prevMessages) => {
            // Avoid duplicate messages
            if (prevMessages.some(msg => msg._id === newMessage._id)) {
              return prevMessages;
            }
            
            return [...prevMessages, {
              _id: newMessage._id,
              text: newMessage.text,
              username: newMessage.username,
              createdAt: new Date(newMessage.createdAt),
            }];
          });
        }
      } catch (error) {
        console.error("Failed to parse incoming message:", error);
      }
    };

    ws.current.onclose = (event) => {
      if (!isMounted.current) return;
      
      console.log("WebSocket connection closed with code:", event.code, "reason:", event.reason);
      setConnectionStatus('disconnected');
      ws.current = null;
      
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      
      // Don't reconnect if authentication failed
      if (event.code === 1008) {
        console.error("Authentication failed, not reconnecting");
        return;
      }
      
      // Intentional closure - don't reconnect
      if (event.code === 1000 && (
          event.reason === "Creating new connection" || 
          event.reason === "Component unmounting" ||
          event.reason === "User initiated disconnect" ||
          event.reason === "Switching channels/DMs"
        )) {
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
  }, [token, selection, messageQueue, retryCount]);

  const sendMessage = useCallback((messageData: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(messageData));
      return true;
    } else {
      setMessageQueue(prev => [...prev, messageData]);
      return false;
    }
  }, []);

  const handleSendMessage = () => {
    if (!message.trim() || !selection) {
      return;
    }

    let newMessage;
    
    if (selection.type === 'directMessage') {
      newMessage = { 
        type: 'directMessage', 
        text: message, 
        username, 
        teamName: selection.teamName 
      };
    } else {
      newMessage = { 
        type: 'message', 
        text: message, 
        username, 
        teamName: selection.teamName, 
        channelName: selection.channelName 
      };
    }

    const sent = sendMessage(newMessage);
    if (sent) {
      setMessage("");
    }
  };

  const fetchMessages = useCallback(async () => {
    if (!selection) {
      setMessages([]);
      return;
    }

    try {
      if (selection.type === 'directMessage') {
        const response = await getDirectMessages(selection.teamName, selection.username);
        if (!isMounted.current) return;
        
        setMessages(response.directMessages.map((msg: any) => ({
          _id: msg._id,
          text: msg.text,
          username: msg.username,
          createdAt: new Date(msg.createdAt),
        })));
      } else {
        const channelMessages = await getMessages(selection.teamName, selection.channelName);
        if (!isMounted.current) return;
        
        setMessages(channelMessages.map((msg: any) => ({
          _id: msg._id,
          text: msg.text,
          username: msg.username,
          createdAt: new Date(msg.createdAt),
        })));
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  }, [selection]);

  const handleDeleteMessage = async () => {
    if (!contextMenu.selected || !selection || selection.type !== 'channel') {
      return;
    }
    
    try {
      await deleteMessage(selection.teamName, selection.channelName, contextMenu.selected);
      setMessages((prevMessages) => prevMessages.filter((msg) => msg._id !== contextMenu.selected));
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
  
  // Effects
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Initial WebSocket setup or close when selection changes completely
  useEffect(() => {
    // Connect only when we have necessary values
    if (token && selection) {
      // Check if we need to initialize or reconnect
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
        connectWebSocket();
      }
    } else if (!selection && ws.current) {
      // Close connection if selection becomes empty
      ws.current.close(1000, "No selection");
      ws.current = null;
    }
  
    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      if (ws.current) {
        ws.current.close(1000, "Component unmounting");
        ws.current = null;
      }
    };
  }, [token, selection, connectWebSocket]);

  // Handle channel/DM switching when WebSocket is already open
  useEffect(() => {
    // Skip if no selection or WebSocket isn't open
    if (!selection || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
      return;
    }
    
    // Save current selection to ref to avoid infinite loops
    const prevSelection = currentSelection.current;
    currentSelection.current = selection;
    
    // Skip initial setup
    if (!prevSelection) {
      return;
    }
    
    // Check if selection has meaningfully changed
    const hasSelectionChanged = 
      (prevSelection.type !== selection.type) ||
      (selection.type === 'channel' && prevSelection.type === 'channel' && 
       (prevSelection.teamName !== selection.teamName || 
        prevSelection.channelName !== selection.channelName)) ||
      (selection.type === 'directMessage' && prevSelection.type === 'directMessage' && 
       (prevSelection.teamName !== selection.teamName || 
        prevSelection.username !== selection.username));
    
    // If selection has changed, send join message
    if (hasSelectionChanged) {
      console.log("Selection changed, sending join message");
      
      if (selection.type === 'channel') {
        ws.current.send(JSON.stringify({ 
          type: "join", 
          teamName: selection.teamName, 
          channelName: selection.channelName 
        }));
      } else {
        ws.current.send(JSON.stringify({ 
          type: "joinDirectMessage", 
          teamName: selection.teamName, 
          username: selection.username 
        }));
      }
    }
  }, [selection]);

  // Context menu configuration
  const menuItems = [
    { label: 'Delete Message', onClick: handleDeleteMessage },
  ];

  const getStyledComponent = (baseStyle: any) => ({
    ...baseStyle,
    ...(theme === "dark" && baseStyle["&.dark-mode"])
  });

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
      </div>
      
      <div style={getStyledComponent(styles.inputBox)}>
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
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
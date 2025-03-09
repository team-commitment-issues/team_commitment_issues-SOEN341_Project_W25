import React, { useEffect, useState, useRef, useCallback } from "react";
import styles from "../Styles/dashboardStyles";
import { deleteMessage, getMessages } from "../Services/channelService";
import { jwtDecode } from "jwt-decode";
import ContextMenu from "./UI/ContextMenu";
import { getDirectMessages, createDirectMessage } from "../Services/directMessageService";

interface chatMessage {
  _id: string;
  text: string;
  username: string;
  createdAt: Date;
}

interface TeamChannelProps {
  selectedTeam: string | null;
  selectedChannel: string | null;
  contextMenu: { visible: boolean; x: number; y: number; selected: string };
  setContextMenu: (arg: { visible: boolean; x: number; y: number; selected: string; }) => void;
  selectedDM: string | null;
  setSelectedDM: (arg: string | null) => void;
}

const TeamMessages: React.FC<TeamChannelProps> = ({ selectedTeam, selectedChannel, contextMenu, setContextMenu, selectedDM, setSelectedDM }) => {
  const [messages, setMessages] = useState<chatMessage[]>([]);
  const [message, setMessage] = useState<string>("");
  const ws = useRef<WebSocket | null>(null);

  const token = localStorage.getItem("token");
  const username = token ? (jwtDecode<any>(token)).username : "";

  const handleSendMessage = async () => {
    if (!message || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.log("Cannot send message");
      return;
    }
    if (selectedDM && selectedTeam) {
      try {
        await createDirectMessage(selectedDM, selectedTeam);
      } catch (err: any) {
        if (err.message !== "Direct message already exists") {
          console.error("Failed to create direct message", err);
        }
      }
      
      const newMessage = { type: 'directMessage', text: message, username, teamName: selectedTeam };
      ws.current.send(JSON.stringify(newMessage));
      setMessage("");
    } else {
      const newMessage = { type: 'message', text: message, username, teamName: selectedTeam, channelName: selectedChannel, createdAt: new Date() };
      ws.current.send(JSON.stringify(newMessage));
      setMessage("");
    }
  };

  const fetchMessages = useCallback(async () => {
    if (!selectedChannel && !selectedDM) {
      setMessages([]);
      return;
    }
    try {
      if (selectedTeam && selectedDM) {
        const directMessages = await getDirectMessages(selectedTeam, selectedDM!);
        setMessages(directMessages.directMessages.map((msg: any) => ({
          _id: msg._id,
          text: msg.text,
          username: msg.username,
          createdAt: new Date(msg.createdAt),
        })));
      }
      else if (selectedTeam && selectedChannel) {
        const channelMessages = await getMessages(selectedTeam!, selectedChannel!);
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
  }, [selectedTeam, selectedChannel, selectedDM]);

  const handleDeleteMessage = async () => {
    if (!contextMenu.selected) {
      console.error("No message selected");
      return;
    }
    try {
      if (!selectedTeam || !selectedChannel) return;
      await deleteMessage(selectedTeam, selectedChannel, contextMenu.selected);
      setMessages((prevMessages) => prevMessages.filter((msg) => msg._id !== contextMenu.selected));
      setContextMenu({ visible: false, x: 0, y: 0, selected: "" });
    } catch (err) {
      console.error("Failed to delete message", err);
    }
  }

  useEffect(() => {
    fetchMessages();
  }, [selectedChannel, selectedTeam, fetchMessages, selectedDM]);

  useEffect(() => {
    if (!token) {
      console.error("No token available");
      return;
    }

    const connectWebSocket = () => {
      if (ws.current) {
        ws.current.close();
      }

      ws.current = new WebSocket(`ws://localhost:5000?token=${token}`);

      ws.current.onopen = () => {
        console.log("WebSocket connection established");
        if (selectedChannel) {
          ws.current?.send(JSON.stringify({ type: "join", teamName: selectedTeam, channelName: selectedChannel }));
          console.log("FrontEnd: Joined Channel");
        } else if (selectedDM) {
          ws.current?.send(JSON.stringify({ type: "joinDirectMessage", teamName: selectedTeam, username: selectedDM }));
          console.log("FrontEnd: Joined DM");
        }
      };

      ws.current.onmessage = (event) => {
        const newMessage = JSON.parse(event.data);
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      };

      ws.current.onclose = () => {
        console.log("WebSocket connection closed, attempting to reconnect...");
        setTimeout(connectWebSocket, 1000); // Attempt to reconnect after 1 second
      };

      ws.current.onerror = (error) => console.error("WebSocket error:", error);
    };

    if (!ws.current) {
      connectWebSocket();
    }

    return () => {
      ws.current?.close();
    };
  }, [token, selectedChannel, selectedTeam, selectedDM]);

  const handleContextMenu = (event: any, messageId: string) => {
    event.preventDefault();
    setContextMenu({ visible: true, x: event.clientX, y: event.clientY, selected: messageId });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, selected: "" });
  };

  const menuItems = [
    { label: 'Delete Message', onClick: handleDeleteMessage },
    // { label: 'Direct Message', onClick: handleDirectMessage },
  ];

  return (
    <div style={styles.teamMessages}>
      <div style={styles.chatHeader}>
        {selectedDM ? `Direct Messages with ${selectedDM}` : `Channel: ${selectedChannel}`}
      </div>
      <div style={styles.chatBox}>
        {messages.length === 0 ? (
          <p style={styles.chatPlaceholder}>Select a user to chat with.</p>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              onContextMenu={e => handleContextMenu(e, msg._id)}
              style={{
                ...styles.chatMessage,
                alignSelf: msg.username === username ? "flex-end" : "flex-start",
                backgroundColor: msg.username === username ? "#DCF8C6" : "#FFF",
              } as React.CSSProperties}
            >
              <div>
                <strong>{msg.username}</strong>: {msg.text} <em>({msg.createdAt ? msg.createdAt.toLocaleString() : "Unknown Date"})</em>
              </div>
            </div>
          ))
        )}
      </div>
      <div style={styles.inputBox}>
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={styles.inputField}
        />
        <button onClick={handleSendMessage} style={styles.sendButton}>
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

export default TeamMessages;
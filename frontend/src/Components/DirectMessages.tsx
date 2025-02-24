import React, { useEffect, useState, useRef } from "react";
import styles from "../Styles/dashboardStyles";
import { getMessages } from "../Services/channelService";
import { jwtDecode } from "jwt-decode";

interface chatMessage {
  text: string;
  username: string;
  createdAt: Date;
}

interface DirectMessagesProps {
  selectedTeam: string | null;
  selectedChannel: string | null;
}

const DirectMessages: React.FC<DirectMessagesProps> = ({ selectedTeam, selectedChannel }) => {
  const [messages, setMessages] = useState<chatMessage[]>([]);
  const [message, setMessage] = useState<string>("");
  const ws = useRef<WebSocket | null>(null);

  const token = localStorage.getItem("token");
  const username = token ? (jwtDecode<any>(token)).username : "";

  const handleSendMessage = () => {
    if (!message || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.log("Cannot send message");
      return;
    }
    const newMessage = { type: 'message', text: message, username, teamName: selectedTeam, channelName: selectedChannel, createdAt: new Date() };
    ws.current.send(JSON.stringify(newMessage));
    setMessage("");
  };

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedChannel) {
        setMessages([]);
        return;
      }
      try {
        const messages = await getMessages(selectedTeam!, selectedChannel!);
        setMessages(messages.map((msg: any) => ({
          text: msg.text,
          username: msg.username,
          createdAt: new Date(msg.createdAt),
        })));
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    };
    fetchMessages();
  }, [selectedChannel, selectedTeam]);

  useEffect(() => {
    if (!token) {
      console.error("No token available");
      return;
    }

    if (!ws.current) {
      ws.current = new WebSocket(`ws://localhost:5000?token=${token}`);

      ws.current.onopen = () => {
        console.log("WebSocket connection established");
      };

      ws.current.onmessage = (event) => {
        const newMessage = JSON.parse(event.data);
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      };

      ws.current.onclose = () => console.log("WebSocket connection closed");
      ws.current.onerror = (error) => console.error("WebSocket error:", error);

      return () => {
        ws.current?.close();
      };
    }
  }, [token]);

  useEffect(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN && selectedChannel) {
      ws.current.send(JSON.stringify({ type: "join", teamName: selectedTeam, channelName: selectedChannel }));
    }
  }, [selectedChannel, selectedTeam]);

  return (
    <div style={styles.directMessages}>
      <div style={styles.chatHeader}>Direct Messages</div>
      <div style={styles.chatBox}>
        {messages.length === 0 ? (
          <p style={styles.chatPlaceholder}>Select a user to chat with.</p>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
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
    </div>
  );
};

export default DirectMessages;
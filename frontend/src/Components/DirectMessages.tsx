import React, { useState } from "react";
import styles from "../Styles/dashboardStyles";

const DirectMessages: React.FC = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);

  const handleSendMessage = () => {
    if (message.trim() !== "") {
      setMessages([...messages, message]);
      setMessage("");
    }
  };

  return (
    <div style={styles.directMessages}>
      <h3 style={styles.chatHeader}>Direct Messages</h3>
      <div style={styles.chatBox}>
        {messages.length === 0 ? (
          <p style={styles.chatPlaceholder}>Select a user to chat with.</p>
        ) : (
          messages.map((msg, index) => (
            <div key={index} style={styles.chatMessage as React.CSSProperties}>
              {msg}
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

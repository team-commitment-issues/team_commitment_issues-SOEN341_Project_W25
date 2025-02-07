import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Input from '../Components/UI/Input';
import Button from '../Components/UI/Button';
import styles from '../Styles/channelStyles';

interface Message {
  sender: string;
  content: string;
  timestamp: string;
}

const ChannelPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const fetchMessages = async () => {
    try {
      const response = await axios.get('/api/channel/messages');
      setMessages(response.data);
    } catch (err) {
      setError('Could not load messages.');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const response = await axios.post('/api/channel/messages', {
        content: newMessage,
        sender: localStorage.getItem('username'),
        timestamp: new Date().toISOString(),
      });
      setMessages((prev) => [...prev, response.data]);
      setNewMessage('');
    } catch (err) {
      setError('Failed to send the message.');
    }
  };

  const styles = {
    container: { /* styles here */ },
    error: { /* styles here */ },
    messageList: { /* styles here */ },
    messageItem: { /* styles here */ },
    messageInputContainer: { /* styles here */ },
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  return (
    <div style={styles.container}>
      <h2>Channel Messages</h2>
      {error && <p style={styles.error}>{error}</p>}
      <div style={styles.messageList}>
        {messages.map((msg, index) => (
          <div key={index} style={styles.messageItem}>
            <strong>{msg.sender}:</strong> {msg.content} <em>({new Date(msg.timestamp).toLocaleString()})</em>
          </div>
        ))}
      </div>
      <div style={styles.messageInputContainer}>
        <Input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
        />
        <Button text="Send" onClick={sendMessage} />
      </div>
    </div>
  );
};

export default ChannelPage;

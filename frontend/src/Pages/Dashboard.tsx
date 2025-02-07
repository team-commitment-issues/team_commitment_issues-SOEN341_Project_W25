import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../Styles/dashboardStyles';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleCreateTeam = () => {
    navigate('/create-team');
  };

  const handleJoinTeam = () => {
    navigate('/join-team');
  };

  const handleEnterChat = () => {
    navigate('/chat');
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Welcome to Chat Haven</h1>
      <button style={styles.button} onClick={handleCreateTeam}>Create a Team</button>
      <button style={styles.button} onClick={handleJoinTeam}>Join Team</button>
      <button style={styles.button} onClick={handleEnterChat}>Enter Chat</button>
    </div>
  );
};

export default Dashboard;
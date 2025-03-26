import React from 'react';
import styles from '../Styles/dashboardStyles.ts';
import { useTheme } from '../Context/ThemeContext.tsx';

const AdminActions: React.FC = () => {
  const handleAssignUser = () => {
    alert('Assign User action triggered!');
  };

  const { theme } = useTheme();

  const buttonStyle: React.CSSProperties = {
    ...styles.assignUserButton,
    backgroundColor: '#007bff',
    color: '#fff',
    border: '1px solid #007bff',
    textAlign: 'center',
    cursor: 'pointer',
    transition: '0.3s',
    ...(theme === 'dark' && {
      backgroundColor: '#007bff',
      border: '1px solid #007bff',
      color: '#fff'
    })
  };

  return (
    <div
      style={{
        ...styles.adminActions,
        ...(theme === 'dark' && styles.adminActions['&.dark-mode'])
      }}
    >
      <h3
        style={{
          ...styles.adminActionsHeading,
          ...(theme === 'dark' && styles.adminActionsHeading['&.dark-mode'])
        }}
      >
        Assign Admins
      </h3>
      <p
        style={{
          ...styles.adminActionsText,
          ...(theme === 'dark' && styles.adminActionsText['&.dark-mode'])
        }}
      >
        Select a user and assign them as an admin to a team.
      </p>
      <button style={buttonStyle} onClick={handleAssignUser}>
        Assign User
      </button>
    </div>
  );
};

export default AdminActions;

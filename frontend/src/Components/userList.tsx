import React, { useState } from "react";
import styles from "../Styles/dashboardStyles";

const UserList: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const users = ["User 1", "User 2", "User 3", "User N"];

  const handleAssignUser = () => {
    if (selectedUser) {
      alert(`Assigned ${selectedUser} as an admin!`);
      setSelectedUser(null); // Clear selection after assignment
    } else {
      alert("Please select a user to assign.");
    }
  };

  return (
    <div style={styles.userList}>
      <h3 
        onClick={() => setCollapsed(!collapsed)} 
        style={styles.listHeader}
      >
        Users {collapsed ? "▲" : "▼"}
      </h3>

      {!collapsed && (
        <ul style={styles.listContainer}>
          {users.map((user, index) => (
            <li
              key={index}
              style={{
                ...styles.listItem,
                backgroundColor: selectedUser === user ? "#D3E3FC" : "transparent",
                fontWeight: selectedUser === user ? "bold" : "normal",
              }}
              onClick={() => setSelectedUser(user)}
            >
              {user}
            </li>
          ))}
        </ul>
      )}

      <button 
        style={{
          ...styles.assignUserButton, 
          opacity: selectedUser ? 1 : 0.6,
          cursor: selectedUser ? "pointer" : "not-allowed"
        }} 
        onClick={handleAssignUser} 
        disabled={!selectedUser}
      >
        Assign User
      </button>
    </div>
  );
};

export default UserList;

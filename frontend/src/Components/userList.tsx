import React, { useEffect, useState } from "react";
import styles from "../Styles/dashboardStyles";
import { getUsers } from "../Services/dashboardService";

interface User {
    username: string;
}

interface UserListProps {
    selectedUsers: string[];
    setSelectedUsers: React.Dispatch<React.SetStateAction<string[]>>;
}

const UserList: React.FC<UserListProps> = ({ selectedUsers, setSelectedUsers }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersList = await getUsers();
        setUsers(usersList);
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };

    fetchUsers();
  }, []);

  const toggleUserSelection = (user: string) => {
    setSelectedUsers((prevSelectedUsers) =>
      prevSelectedUsers.includes(user)
        ? prevSelectedUsers.filter((u) => u !== user)
        : [...prevSelectedUsers, user]
    );
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
          {users.map((user) => (
            <li
              key={user.username}
              style={{
                ...styles.listItem,
                backgroundColor: selectedUsers.includes(user.username) ? "#D3E3FC" : "transparent",
                fontWeight: selectedUsers.includes(user.username) ? "bold" : "normal",
              }}
              onClick={() => toggleUserSelection(user.username)}
            >
              {user.username}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UserList;
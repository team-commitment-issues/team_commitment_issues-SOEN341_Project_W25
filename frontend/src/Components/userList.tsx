import React, { useEffect, useState } from "react";
import styles from "../Styles/dashboardStyles";
import { getUsers } from "../Services/dashboardService";

interface User {
    username: string;
}

interface UserListProps {
  selectedUsers: string[];
  setSelectedUsers: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTeam: string | null;
  setSelectedTeam: React.Dispatch<React.SetStateAction<string | null>>;
  selectedChannel: string | null;
  setSelectedChannel: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedTeamMembers: React.Dispatch<React.SetStateAction<string[]>>;
}

const UserList: React.FC<UserListProps> = ({selectedUsers, setSelectedUsers, selectedTeam, setSelectedTeam, selectedChannel, setSelectedChannel, setSelectedTeamMembers}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersList = await getUsers();
        setUsers(usersList);
      } catch (err) {
        setUsers([]);
        //console.error("Failed to fetch users", err);
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
    setSelectedTeam(null);
    setSelectedChannel(null);
    setSelectedTeamMembers([]);
  };

  if (!users.length) {
    return null;
  }

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
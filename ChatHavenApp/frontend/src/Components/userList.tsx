import React, { useEffect, useState } from "react";
import styles from "../Styles/dashboardStyles";
import { getUsers } from "../Services/dashboardService";
import ContextMenu from "./UI/ContextMenu";
import { addUserToTeam } from "../Services/superAdminService";
import { addUserToChannel } from "../Services/channelService";

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
  contextMenu: { visible: boolean; x: number; y: number; selected: string;};
  setContextMenu: (arg: { visible: boolean; x: number; y: number; selected: string;} ) => void;
  handleRefresh: () => void;
}

const UserList: React.FC<UserListProps> = ({selectedUsers, setSelectedUsers, selectedTeam, setSelectedTeam, selectedChannel, setSelectedChannel, setSelectedTeamMembers, contextMenu, setContextMenu, handleRefresh}) => {
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
    // setSelectedTeam(null);
    // setSelectedChannel(null);
    setSelectedTeamMembers([]);
  };

  if (!users.length) {
    return null;
  }

  const handleContextMenu = (event: any, username: string) => {
    event.preventDefault();
    setContextMenu({ visible: true, x: event.clientX, y: event.clientY, selected: username });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, selected: "" });
  };

  const menuItems = [
    { label: 'Add User to Selected Team', onClick: async () => selectedTeam && await addUserToTeam(contextMenu.selected, selectedTeam, "MEMBER").then(handleRefresh) },
    { label: 'Add User to Selected Channel', onClick: async () => selectedTeam && selectedChannel && await addUserToChannel(contextMenu.selected, selectedTeam, selectedChannel).then(handleRefresh) },
  ];

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
              onContextMenu={e => handleContextMenu(e, user.username)}
              value={user.username}
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

export default UserList;
import React, { useEffect, useState } from "react";
import styles from "../Styles/dashboardStyles";
import { getUsers } from "../Services/dashboardService";
import ContextMenu from "./UI/ContextMenu";
import { addUserToTeam } from "../Services/superAdminService";
import { addUserToChannel } from "../Services/channelService";
import { useTheme } from "../Context/ThemeContext";
import { Selection, ContextMenuState } from "../types/shared";

interface User {
  username: string;
}

interface UserListProps {
  selectedUsers: string[];
  setSelectedUsers: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTeam: string | null;
  selection: Selection;
  setSelectedTeamMembers: React.Dispatch<React.SetStateAction<string[]>>;
  contextMenu: ContextMenuState;
  setContextMenu: (arg: ContextMenuState) => void;
  handleRefresh: () => void;
}

const UserList: React.FC<UserListProps> = ({
  selectedUsers,
  setSelectedUsers,
  selectedTeam,
  selection,
  setSelectedTeamMembers,
  contextMenu,
  setContextMenu,
  handleRefresh,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const { theme } = useTheme();

  // Helper function to get the current channel from selection
  const getCurrentChannel = () => {
    return selection?.type === 'channel' ? selection.channelName : null;
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersList = await getUsers();
        setUsers(usersList);
      } catch (err) {
        setUsers([]);
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
    { 
      label: 'Add User to Selected Team', 
      onClick: async () => selectedTeam && await addUserToTeam(contextMenu.selected, selectedTeam, "MEMBER").then(handleRefresh) 
    },
    { 
      label: 'Add User to Selected Channel', 
      onClick: async () => {
        const selectedChannel = getCurrentChannel();
        return selectedTeam && selectedChannel && 
          await addUserToChannel(contextMenu.selected, selectedTeam, selectedChannel).then(handleRefresh);
      }
    },
  ];

  return (
    <div style={{ ...styles.userList, ...(theme === "dark" && styles.userList["&.dark-mode"]) }}>
      <h3
        onClick={() => setCollapsed(!collapsed)}
        style={{ ...styles.listHeader, ...(theme === "dark" && styles.listHeader["&.dark-mode"]) }}
      >
        Users {collapsed ? "▲" : "▼"}
      </h3>

      {!collapsed && (
        <ul style={{ ...styles.listContainer, ...(theme === "dark" && styles.listContainer["&.dark-mode"]) }}>
          {users.map((user) => (
            <li
              key={user.username}
              onContextMenu={(e) => handleContextMenu(e, user.username)}
              value={user.username}
              style={{
                ...styles.listItem,
                backgroundColor: selectedUsers.includes(user.username) ? "#D3E3FC" : "transparent",
                fontWeight: selectedUsers.includes(user.username) ? "bold" : "normal",
                ...(theme === "dark" && styles.listItem["&.dark-mode:hover"]),
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
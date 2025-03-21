import React, { useEffect, useState } from "react";
import styles from "../Styles/dashboardStyles";
import { getUsers } from "../Services/dashboardService";
import ContextMenu from "./UI/ContextMenu";
import { addUserToTeam } from "../Services/superAdminService";
import { addUserToChannel } from "../Services/channelService";
import { useTheme } from "../Context/ThemeContext";
import { useOnlineStatus } from "../Context/OnlineStatusContext";
import UserStatusIndicator from "./UI/UserStatusIndicator";
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
  const { refreshStatuses, getUserStatus } = useOnlineStatus();

  // Helper function to get the current channel from selection
  const getCurrentChannel = () => {
    return selection?.type === 'channel' ? selection.channelName : null;
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersList = await getUsers();
        setUsers(usersList);
        
        await refreshStatuses(usersList.map((user: { username: any; }) => user.username));
      } catch (err) {
        setUsers([]);
      }
    };

    fetchUsers();
  }, [refreshStatuses]);

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

  const handleContextMenu = (event: React.MouseEvent, username: string) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      selected: username,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, selected: "" });
  };

  const formatLastSeen = (lastSeen?: Date) => {
    if (!lastSeen) return 'Unknown';
    
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return lastSeen.toLocaleDateString();
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
    <div
      style={{
        ...styles.userList,
        ...(theme === "dark" && styles.userList["&.dark-mode"]),
      }}
    >
      <h3
        onClick={() => setCollapsed(!collapsed)}
        style={{
          ...styles.listHeader,
          ...(theme === "dark" && styles.listHeader["&.dark-mode"]),
        }}
      >
        Users {collapsed ? "▲" : "▼"}
      </h3>

      {!collapsed && (
        <ul
          style={{
            ...styles.listContainer,
            ...(theme === "dark" && styles.listContainer["&.dark-mode"]),
          }}
        >
          {users.map((user) => {
            const userStatus = getUserStatus(user.username);
            const status = userStatus?.status || 'offline';
            
            return (
              <li
                key={user.username}
                onContextMenu={(e) => handleContextMenu(e, user.username)}
                style={{
                  ...styles.listItem,
                  backgroundColor: selectedUsers.includes(user.username)
                    ? (theme === "dark" ? "#3A3F44" : "#D3E3FC")
                    : "transparent",
                  fontWeight: selectedUsers.includes(user.username)
                    ? "bold"
                    : "normal",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px",
                  color: theme === "dark" ? "#FFF" : "inherit",
                }}
                onClick={() => toggleUserSelection(user.username)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <UserStatusIndicator username={user.username} size="small" />
                  <span>{user.username}</span>
                </div>

                <span style={{ 
                  fontSize: "12px", 
                  color: theme === "dark" ? "#AAA" : "#606770",
                  marginLeft: "auto"
                }}>
                  {status === 'online'
                    ? "Online"
                    : status === 'away'
                      ? "Away"
                      : status === 'busy'
                        ? "Busy"
                        : `Last seen: ${formatLastSeen(userStatus?.lastSeen)}`
                  }
                </span>
              </li>
            );
          })}
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
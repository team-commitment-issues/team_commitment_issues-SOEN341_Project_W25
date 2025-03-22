import React, { useCallback, useEffect, useState } from "react";
import styles from "../Styles/dashboardStyles";
import { getUsersInTeam, getUsersInChannel } from "../Services/dashboardService";
import { demoteToUser, promoteToAdmin, removeUserFromTeam } from "../Services/superAdminService";
import { removeUserFromChannel } from "../Services/channelService";
import ContextMenu from "./UI/ContextMenu";
import { useTheme } from "../Context/ThemeContext";
import { Selection, ContextMenuState } from "../types/shared";
import { useOnlineStatus } from "../Context/OnlineStatusContext";
import UserStatusIndicator from "./UI/UserStatusIndicator";

interface User {
    username: string;
    role: string;
}

interface TeamMemberListProps {
  selectedTeamMembers: string[];
  setSelectedTeamMembers: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTeam: string | null;
  selection: Selection;
  setSelection: React.Dispatch<React.SetStateAction<Selection>>;
  contextMenu: ContextMenuState;
  setContextMenu: (arg: ContextMenuState) => void;
  refreshState: boolean;
}

const TeamMemberList: React.FC<TeamMemberListProps> = ({
  selectedTeamMembers, 
  setSelectedTeamMembers, 
  selectedTeam, 
  selection,
  setSelection,
  contextMenu, 
  setContextMenu, 
  refreshState
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [title, setTitle] = useState<string>("Users");
  const [selectedUserRole, setSelectedUserRole] = useState<string>("MEMBER");  
  const { theme } = useTheme();
  const { refreshStatuses, subscribeToTeamStatuses, subscribeToChannelStatuses } = useOnlineStatus();

  const getCurrentChannel = () => {
    return selection?.type === 'channel' ? selection.channelName : null;
  };

  const setSelectedDm = (username: string | null) => {
    if (username && selectedTeam) {
      setSelection({
        type: 'directMessage',
        teamName: selectedTeam,
        username
      });
    } else {
      setSelection(null);
    }
  };

  const fetchUsers = useCallback(async () => {
    try {
      const selectedChannel = selection?.type === 'channel' ? selection.channelName : null;
      
      if (selectedChannel && selectedTeam) {
        setTitle("Channel Members");
        const channelMemberList = await getUsersInChannel(selectedTeam, selectedChannel);
        setUsers(channelMemberList);
        await refreshStatuses(channelMemberList.map((user: { username: any; }) => user.username));
        subscribeToChannelStatuses(selectedTeam, selectedChannel);
      } else if (selectedTeam) {
        setTitle("Team Members");
        const teamMemberList = await getUsersInTeam(selectedTeam);
        setUsers(teamMemberList);
        await refreshStatuses(teamMemberList.map((user: { username: any; }) => user.username));
        subscribeToTeamStatuses(selectedTeam);
      } else {
        return [];
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  }, [selection, selectedTeam, refreshStatuses, subscribeToChannelStatuses, subscribeToTeamStatuses]);

  useEffect(() => {
    fetchUsers();
  }, [selection, selectedTeam, refreshState, fetchUsers]);

  const toggleTeamMemberSelection = (user: string) => {
    setSelectedTeamMembers((previouslySelectedMembers) =>
      previouslySelectedMembers.includes(user)
        ? previouslySelectedMembers.filter((u) => u !== user)
        : [...previouslySelectedMembers, user]
    );
  };

  if (!selectedTeam) {
    return null;
  }

  const handleContextMenu = (event: any, {username, role }: {username: string, role: string}) => {
    event.preventDefault();
    setSelectedUserRole(role);
    setContextMenu({ visible: true, x: event.clientX, y: event.clientY, selected: username });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, selected: "" });
  };

  const selectedChannel = getCurrentChannel();

  const menuItems = [
    { label: 'Remove User from Team', onClick: async () => selectedTeam && await removeUserFromTeam(contextMenu.selected, selectedTeam).then(fetchUsers) },
    { label: 'Remove User from Channel', onClick: async () => selectedTeam && selectedChannel && await removeUserFromChannel(contextMenu.selected, selectedTeam, selectedChannel).then(fetchUsers) },
    { label: 'Direct Message User', onClick: () => setSelectedDm(contextMenu.selected) },
  ];

  const adminOptions = [
    ...menuItems,
    { label: 'Demote User from Admin', onClick: async () => await demoteToUser(contextMenu.selected, selectedTeam).then(fetchUsers) },
  ];

  const memberOptions = [
    ...menuItems,
    { label: 'Promote User to Admin', onClick: async () => await promoteToAdmin(contextMenu.selected, selectedTeam).then(fetchUsers) },
  ];

  const getStyledComponent = (baseStyle: any) => ({
    ...baseStyle,
    ...(theme === "dark" && baseStyle["&.dark-mode"]),
  });

  return (
    <div style={getStyledComponent(styles.userList)}>
      <h3 
        onClick={() => setCollapsed(!collapsed)} 
        style={getStyledComponent(styles.listHeader)}
      >
        {title} {collapsed ? "▲" : "▼"}
      </h3>

      {!collapsed && (
        <ul style={getStyledComponent(styles.listContainer)}>
          {users.map((user) => (
            <li
              key={user.username}
              onContextMenu={e => handleContextMenu(e, user)}
              value={user.username}
              style={{
                ...getStyledComponent(styles.listItem),
                backgroundColor: selectedTeamMembers.includes(user.username) ? "#D3E3FC" : "transparent",
                fontWeight: selectedTeamMembers.includes(user.username) ? "bold" : "normal",
              }}
              onClick={() => toggleTeamMemberSelection(user.username)}
            >
              <UserStatusIndicator username={user.username} size="small" />
              {user.username} - {user.role}
            </li>
          ))}
        </ul>
      )}
      {contextMenu.visible && (
        <ContextMenu
          items={selectedUserRole === "ADMIN" ? adminOptions : memberOptions}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
};

export default TeamMemberList;
import React, { useCallback, useEffect, useState } from "react";
import styles from "../Styles/dashboardStyles";
import { getUsersInTeam, getUsersInChannel } from "../Services/dashboardService";
import { demoteToUser, promoteToAdmin, removeUserFromTeam } from "../Services/superAdminService";
import { removeUserFromChannel } from "../Services/channelService";
import ContextMenu from "./UI/ContextMenu";

interface User {
    username: string;
    role: string;
}

interface TeamMemberListProps {
  selectedTeamMembers: string[];
  setSelectedTeamMembers: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTeam: string | null;
  selectedChannel: string | null;
  contextMenu: { visible: boolean; x: number; y: number; selected: string };
  setContextMenu: (arg: { visible: boolean; x: number; y: number; selected: string;} ) => void;
  setSelectedDm: React.Dispatch<React.SetStateAction<string | null>>;
  refreshState: boolean;
}

const TeamMemberList: React.FC<TeamMemberListProps> = ({selectedTeamMembers, setSelectedTeamMembers, selectedTeam, selectedChannel, contextMenu, setContextMenu, refreshState, setSelectedDm}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [title, setTitle] = useState<string>("Users");
  const [selectedUserRole, setSelectedUserRole] = useState<string>("MEMBER");  

  const fetchUsers = useCallback(async () => {
    try {
      if (selectedChannel && selectedTeam) {
        setTitle("Channel Members");
        const channelMemberList = await getUsersInChannel(selectedTeam, selectedChannel);
        setUsers(channelMemberList);
      } else if (selectedTeam) {
        setTitle("Team Members");
        const teamMemberList = await getUsersInTeam(selectedTeam);
        setUsers(teamMemberList);
        console.log(teamMemberList)
      } else {
        return [];
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  }, [selectedChannel, selectedTeam]);

  useEffect(() => {
    fetchUsers();
  }, [selectedChannel, selectedTeam, fetchUsers, refreshState]);

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

  return (
    <div style={styles.userList}>
      <h3 
        onClick={() => setCollapsed(!collapsed)} 
        style={styles.listHeader}
      >
        {title} {collapsed ? "▲" : "▼"}
      </h3>

      {!collapsed && (
        <ul style={styles.listContainer}>
          {users.map((user) => (
            <li
              key={user.username}
              onContextMenu={e => handleContextMenu(e, user)}
              value={user.username}
              style={{
                ...styles.listItem,
                backgroundColor: selectedTeamMembers.includes(user.username) ? "#D3E3FC" : "transparent",
                fontWeight: selectedTeamMembers.includes(user.username) ? "bold" : "normal",
              }}
              onClick={() => toggleTeamMemberSelection(user.username)}
            >
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
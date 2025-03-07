import React, { useEffect, useState } from "react";
import styles from "../Styles/dashboardStyles";
import { getUsersInTeam, getUsersInChannel } from "../Services/dashboardService";
import { removeUserFromTeam } from "../Services/superAdminService";
import { removeUserFromChannel } from "../Services/channelService";
import ContextMenu from "./UI/ContextMenu";

interface User {
    username: string;
}

interface TeamMemberListProps {
  selectedTeamMembers: string[];
  setSelectedTeamMembers: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTeam: string | null;
  selectedChannel: string | null;
  contextMenu: { visible: boolean; x: number; y: number; selected: string };
  setContextMenu: (arg: { visible: boolean; x: number; y: number; selected: string;} ) => void;
}

const TeamMemberList: React.FC<TeamMemberListProps> = ({selectedTeamMembers, setSelectedTeamMembers, selectedTeam, selectedChannel, contextMenu, setContextMenu}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [title, setTitle] = useState<string>("Users");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (selectedChannel && selectedTeam) {
          setTitle("Channel Members");
          const channelMemberList = await getUsersInChannel(selectedTeam, selectedChannel);
          setUsers(channelMemberList);
        } else if (selectedTeam) {
          setTitle("Team Members");
          const teamMemberList = await getUsersInTeam(selectedTeam);
          setUsers(teamMemberList);
        } else {
          return [];
        }
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };

    fetchUsers();
  }, [selectedChannel, selectedTeam]);

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

  const handleContextMenu = (event: any, username: string) => {
    event.preventDefault();
    setContextMenu({ visible: true, x: event.clientX, y: event.clientY, selected: username });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, selected: "" });
  };

  const menuItems = [
    { label: 'Remove User from Team', onClick: () => selectedTeam && removeUserFromTeam(contextMenu.selected, selectedTeam) },
    { label: 'Remove User from Channel', onClick: () => selectedTeam && selectedChannel && removeUserFromChannel(contextMenu.selected, selectedTeam, selectedChannel) },
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
              onContextMenu={e => handleContextMenu(e, user.username)}
              value={user.username}
              style={{
                ...styles.listItem,
                backgroundColor: selectedTeamMembers.includes(user.username) ? "#D3E3FC" : "transparent",
                fontWeight: selectedTeamMembers.includes(user.username) ? "bold" : "normal",
              }}
              onClick={() => toggleTeamMemberSelection(user.username)}
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

export default TeamMemberList;
import React, { useEffect, useState } from "react";
import styles from "../Styles/dashboardStyles";
import { getUsersInTeam, getUsersInChannel } from "../Services/dashboardService";

interface User {
    username: string;
}

interface TeamMemberListProps {
  selectedTeamMembers: string[];
  setSelectedTeamMembers: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTeam: string | null;
  selectedChannel: string | null;
}

const TeamMemberList: React.FC<TeamMemberListProps> = ({selectedTeamMembers, setSelectedTeamMembers, selectedTeam, selectedChannel}) => {
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
    </div>
  );
};

export default TeamMemberList;
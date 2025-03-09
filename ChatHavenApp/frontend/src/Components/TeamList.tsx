import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrash } from "react-icons/fa";
import { IconType } from "react-icons";
import styles from "../Styles/dashboardStyles";
import { getTeams } from "../Services/dashboardService";
import { deleteTeam } from "../Services/superAdminService";

const TrashIcon: IconType = FaTrash;

interface Team {
    _id: string;
    name: string;
}

interface TeamListProps {
  selectedUsers: string[];
  setSelectedUsers: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTeam: string | null;
  setSelectedTeam: React.Dispatch<React.SetStateAction<string | null>>;
  selectedChannel: string | null;
  setSelectedChannel: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedTeamMembers: React.Dispatch<React.SetStateAction<string[]>>;
}

const TeamList: React.FC<TeamListProps> = ({selectedUsers, setSelectedUsers, selectedTeam, setSelectedTeam, selectedChannel, setSelectedChannel, setSelectedTeamMembers}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const navigate = useNavigate();

  const handleDeleteTeam = async (team: Team) => {
    try {
      await deleteTeam(team.name);
      setTeams((prevTeams) => prevTeams.filter((t) => t.name !== team.name));
      setSelectedTeam((prevSelectedTeam) =>
        prevSelectedTeam === team.name ? null : prevSelectedTeam
      );
    } catch (err) {
      console.error("Failed to delete team", err);
    }
  };

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const teamsList = await getTeams();
        setTeams(teamsList);
      } catch (err) {
        console.error("Failed to fetch teams", err);
      }
    };

    fetchTeams();
  }, []);

  const toggleTeamSelection = (team: string) => {
    setSelectedTeam((prevSelectedTeam) =>
      prevSelectedTeam === team ? null : team
    );
    setSelectedUsers([]);
    setSelectedChannel(null);
    setSelectedTeamMembers([]);
  };

  return (
    <div style={styles.teamList}>
      <h3 onClick={() => setCollapsed(!collapsed)} style={styles.listHeader}>
        Teams {collapsed ? "▲" : "▼"}
      </h3>
      {!collapsed && (
        <ul style={styles.listContainer}>
          {teams.map((team, index) => (
            <li 
              key={index} 
              style={{
                ...styles.listItem,
                backgroundColor: selectedTeam === team.name ? "#D3E3FC" : "transparent",
                fontWeight: selectedTeam === team.name ? "bold" : "normal",
              }}
              onClick={() => toggleTeamSelection(team.name)}
            >
              {team.name}
              <button
                style={styles.deleteTeamButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTeam(team);
                }}
              >
                <TrashIcon style={styles.trashIcon} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button style={styles.createTeamButton} onClick={() => navigate("/create-team", { state: { selectedUsers } })}>
        Create Team
      </button>
    </div>
  );
};

export default TeamList;
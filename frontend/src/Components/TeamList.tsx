import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrash } from "react-icons/fa";
import styles from "../Styles/dashboardStyles";
import { getTeams } from "../Services/dashboardService";

interface Team {
    _id: string;
    name: string;
}

interface TeamListProps {
    selectedUsers: string[];
    selectedTeam: string | null;
    setSelectedTeam: React.Dispatch<React.SetStateAction<string | null>>;
}

const TeamList: React.FC<TeamListProps> = ({ selectedUsers, selectedTeam, setSelectedTeam }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const navigate = useNavigate();

  const handleDeleteTeam = async (team: Team) => {
    try {
      // Add delete team functionality
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
                backgroundColor: selectedTeam === team._id ? "#D3E3FC" : "transparent",
                fontWeight: selectedTeam === team._id ? "bold" : "normal",
              }}
              onClick={() => toggleTeamSelection(team._id)}
            >
              {team.name}
              <button
                style={styles.deleteTeamButton}
                onClick={() => handleDeleteTeam(team)}
              >
                <FaTrash style={styles.trashIcon} />{" "}
                {}
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
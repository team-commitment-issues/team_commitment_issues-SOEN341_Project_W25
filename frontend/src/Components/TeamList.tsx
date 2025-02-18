import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../Styles/dashboardStyles";
import { getTeams } from "../Services/dashboardService";

interface Team {
    _id: string;
    name: string;
}

interface TeamListProps {
    selectedUsers: string[];
}

const TeamList: React.FC<TeamListProps> = ({ selectedUsers }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const navigate = useNavigate();

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

  return (
    <div style={styles.teamList}>
      <h3 onClick={() => setCollapsed(!collapsed)} style={styles.listHeader}>
        Teams {collapsed ? "▲" : "▼"}
      </h3>
      {!collapsed && (
        <ul style={styles.listContainer}>
          {teams.map((team, index) => (
            <li key={index} style={styles.listItem}>
              {team.name}
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
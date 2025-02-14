import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ Import navigate function
import styles from "../Styles/dashboardStyles";

const TeamList: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const teams = ["Team 1", "Team 2", "Team 3"];
  const navigate = useNavigate(); // ✅ Use navigate for redirection

  return (
    <div style={styles.teamList}>
      <h3 onClick={() => setCollapsed(!collapsed)} style={styles.listHeader}>
        Teams {collapsed ? "▲" : "▼"}
      </h3>
      {!collapsed && (
        <ul style={styles.listContainer}>
          {teams.map((team, index) => (
            <li key={index} style={styles.listItem}>
              {team}
            </li>
          ))}
        </ul>
      )}
      <button style={styles.createTeamButton} onClick={() => navigate("/create-team")}>
        Create Team
      </button>
    </div>
  );
};

export default TeamList;

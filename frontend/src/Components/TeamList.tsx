import React, { useState } from "react";
import styles from "../Styles/dashboardStyles";

const TeamList: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const teams = ["Team 1", "Team 2", "Team 3"];

  return (
    <div style={styles.teamList}>
      <h3 onClick={() => setCollapsed(!collapsed)} style={styles.listHeader}>
        Teams {collapsed ? "▲" : "▼"}
      </h3>
      {!collapsed && (
        <ul style={styles.listContainer}>
          {" "}
          {/* ✅ Uses listContainer */}
          {teams.map((team, index) => (
            <li key={index} style={styles.listItem}>
              {" "}
              {/* ✅ Uses listItem */}
              {team}
            </li>
          ))}
        </ul>
      )}
      <button style={styles.createTeamButton}>Create Team</button>
    </div>
  );
};

export default TeamList;

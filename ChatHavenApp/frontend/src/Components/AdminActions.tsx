import React from "react";
import styles from "../Styles/dashboardStyles";
import { useTheme } from "../Context/ThemeContext";

const AdminActions: React.FC = () => {
  const handleAssignUser = () => {
    alert("Assign User action triggered!");
  };
  const { theme } = useTheme();

  return (
    <div style={{ ...styles.adminActions, ...(theme === "dark" && styles.adminActions["&.dark-mode"]) }}>
      <h3 style={{ ...styles.adminActionsHeading, ...(theme === "dark" && styles.adminActionsHeading["&.dark-mode"]) }}>Assign Admins</h3>
      <p style={{ ...styles.adminActionsText, ...(theme === "dark" && styles.adminActionsText["&.dark-mode"]) }}>
        Select a user and assign them as an admin to a team.
      </p>
      <button style={{ ...styles.assignUserButton, ...(theme === "dark" && styles.assignUserButton["&.dark-mode"]) }} onClick={handleAssignUser}>
        Assign User
      </button>
    </div>
  );
};

export default AdminActions;

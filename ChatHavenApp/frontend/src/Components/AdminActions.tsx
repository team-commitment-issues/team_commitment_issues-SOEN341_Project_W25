import React from "react";
import styles from "../Styles/dashboardStyles";

const AdminActions: React.FC = () => {
  const handleAssignUser = () => {
    alert("Assign User action triggered!");
  };

  return (
    <div style={styles.adminActions}>
      <h3 style={styles.adminActionsHeading}>Assign Admins</h3>
      <p style={styles.adminActionsText}>
        Select a user and assign them as an admin to a team.
      </p>
      <button style={styles.assignUserButton} onClick={handleAssignUser}>
        Assign User
      </button>
    </div>
  );
};

export default AdminActions;

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../Styles/dashboardStyles";

const CreateTeam: React.FC = () => {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState("");
  const [channels, setChannels] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Team Created: ${teamName} with ${channels} channels`);
    navigate("/dashboard");
  };

  return (
    <div style={styles.formContainer}>
      <h2 style={styles.formTitle}>Create a New Team</h2>
      <form onSubmit={handleSubmit}>
        <label style={styles.formLabel}>Team Name:</label>
        <input
          type="text"
          style={styles.formInput}
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          required
        />
        
        <label style={styles.formLabel}>Number of Starting Channels:</label>
        <input
          type="number"
          style={styles.formInput}
          value={channels}
          onChange={(e) => setChannels(Number(e.target.value))}
          min="1"
          required
        />

        <div style={styles.formButtons}>
          <button type="button" style={styles.cancelButton} onClick={() => navigate("/dashboard")}>
            Cancel
          </button>
          <button type="submit" style={styles.submitButton}>
            Create Team
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTeam;

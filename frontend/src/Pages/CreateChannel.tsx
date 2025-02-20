import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../Styles/createChannelStyle";

const CreateChannel: React.FC = () => {
  const navigate = useNavigate();
  const [channelName, setChannelName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Channel Created: ${channelName}`);
    navigate("/dashboard");
  };

  return (
    <div style={styles.formContainer}>
      <h2 style={styles.formTitle}>Create a New Channel</h2>
      <form onSubmit={handleSubmit}>
        <label style={styles.formLabel}>Channel Name:</label>
        <input
          type="text"
          style={styles.formInput}
          value={channelName}
          onChange={(e) => setChannelName(e.target.value)}
          required
        />

        <div style={styles.formButtons}>
          <button
            type="button"
            style={styles.cancelButton}
            onClick={() => navigate("/dashboard")}
          >
            Cancel
          </button>
          <button type="submit" style={styles.submitButton}>
            Create Channel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateChannel;

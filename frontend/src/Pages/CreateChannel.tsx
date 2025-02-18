import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createChannel } from "../Services/channelService";
import styles from "../Styles/createChannelStyle";

const CreateChannel: React.FC = () => {
  const navigate = useNavigate();
  const [channelName, setChannelName] = useState("");
  const location = useLocation();
  const { selectedTeam, selectedTeamMembers } = location.state;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createChannel(channelName, selectedTeam, selectedTeamMembers);
      alert("Channel created successfully");
      navigate("/dashboard");
    } catch (err) {
      alert("Failed to create channel");
    }
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

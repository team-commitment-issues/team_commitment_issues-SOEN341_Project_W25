import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createTeam } from '../Services/superAdminService.ts';
import styles from '../Styles/dashboardStyles.ts';

const CreateTeam: React.FC = () => {
  const [teamName, setTeamName] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedUsers } = location.state;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createTeam(teamName, selectedUsers);
      alert('Team created successfully');
      navigate('/dashboard');
    } catch (err) {
      alert('Failed to create team');
    }
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
          onChange={e => setTeamName(e.target.value)}
          required
        />

        <div style={styles.formButtons}>
          <button type="button" style={styles.cancelButton} onClick={() => navigate('/dashboard')}>
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

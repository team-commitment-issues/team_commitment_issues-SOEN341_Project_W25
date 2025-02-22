import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getTeams } from '../Services/dashboardService';
import { addUserToTeam } from '../Services/superAdminService';
import styles from '../Styles/dashboardStyles';

interface Team {
  _id: string;
  name: string;
}

interface AddUserToTeamProps {
  selectedUsers: string[];
}

const AddUserToTeam: React.FC<AddUserToTeamProps> = ({ selectedUsers }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

 
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await getTeams();
        setTeams(response);

      } catch (error) {
        console.error('Error fetching teams:', error);
        setErrorMessage('Failed to load teams. Please try again later.');
        setTeams([]); 
      }
    };

    fetchTeams();
  }, []);

  const handleAddUserToTeam = async () => {
    try {
      const team = teams.find((team) => team.name === selectedTeam);
      if (!team) {
        setErrorMessage('Selected team not found');
        return;
      }

      await Promise.all(
        selectedUsers.map(async (username) => {
          await addUserToTeam(username, team.name, "MEMBER");
        })
      );

      setSuccessMessage('User(s) added to team successfully!');
      setSelectedTeam('');
    } catch (error) {
      console.error('Error adding users to team:', error);
      if (axios.isAxiosError(error) && error.response) {
        setErrorMessage(error.response.data?.error || 'An error occurred');
      } else {
        setErrorMessage('An error occurred');
      }
    }
  };

  if (selectedUsers.length === 0) return null;

  return (
    <div style={styles.addUserToTeamContainer}>
      <h3 style={styles.addUserToTeamHeading}>Add User(s) to Team</h3>

      {errorMessage && (
        <div style={styles.addUserToTeamErrorMessage}>{errorMessage}</div>
      )}
      {successMessage && (
        <div style={styles.addUserToTeamSuccessMessage}>{successMessage}</div>
      )}

      <select
        value={selectedTeam}
        onChange={(e) => setSelectedTeam(e.target.value)}
        style={styles.addUserToTeamSelect}
      >
        <option value="">Select a team</option>
        {Array.isArray(teams) && teams.length > 0 ? (
          teams.map((team) => (
            <option key={team.name} value={team.name}>
              {team.name}
            </option>
          ))
        ) : (
          <option disabled>No teams available</option>
        )}
      </select>

      <button
        style={styles.addUserToTeamButton}
        onClick={handleAddUserToTeam}
        disabled={!selectedTeam}
      >
        Add
      </button>
    </div>
  );
};

export default AddUserToTeam;

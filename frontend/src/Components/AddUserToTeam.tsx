import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getTeams } from '../Services/dashboardService';
import { addUserToTeam } from '../Services/superAdminService';

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
    <div className="p-4 mt-4 border border-gray-300 rounded bg-white">
      <h3 className="text-lg font-semibold mb-2">Add User(s) to Team</h3>

      {errorMessage && (
        <div className="text-red-500 mb-4">{errorMessage}</div>
      )}
      {successMessage && (
        <div className="text-green-500 mb-4">{successMessage}</div>
      )}

      <select
        value={selectedTeam}
        onChange={(e) => setSelectedTeam(e.target.value)}
        className="border p-2 rounded w-full"
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
        className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        onClick={handleAddUserToTeam}
        disabled={!selectedTeam}
      >
        Add
      </button>
    </div>
  );
};

export default AddUserToTeam;

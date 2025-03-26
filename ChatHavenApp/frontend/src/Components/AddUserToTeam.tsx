import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getChannels, getTeams } from '../Services/dashboardService';
import { addUserToTeam } from '../Services/superAdminService';
import { addUserToChannel } from '../Services/channelService';
import styles from '../Styles/dashboardStyles';
import { useTheme } from '../Context/ThemeContext';

interface Team {
  _id: string;
  name: string;
}

interface Channel {
  _id: string;
  name: string;
}

interface AddUserToTeamProps {
  selectedUsers: string[];
}

const ManageTeamMember: React.FC<AddUserToTeamProps> = ({ selectedUsers }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedTeamToChannel, setSelectedTeamToChannel] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const { theme } = useTheme();

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

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await getChannels(selectedTeamToChannel);
        setChannels(response);
      } catch (error) {
        console.error('Error fetching channels:', error);
        setErrorMessage('Failed to load channels. Please try again later.');
        setChannels([]);
      }
    };

    if (selectedTeamToChannel) {
      fetchChannels();
    } else {
      setChannels([]);
    }
  }, [selectedTeamToChannel]);

  const handleAddUserToTeam = async () => {
    try {
      const team = teams.find(team => team.name === selectedTeam);
      if (!team) {
        setErrorMessage('Selected team not found');
        return;
      }

      await Promise.all(
        selectedUsers.map(async username => {
          await addUserToTeam(username, team.name, 'MEMBER');
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

  const handleAddUserToChannel = async () => {
    try {
      const channel = channels.find(channel => channel.name === selectedChannel);
      if (!channel) {
        setErrorMessage('Selected channel not found');
        return;
      }

      await Promise.all(
        selectedUsers.map(async username => {
          await addUserToChannel(username, selectedTeamToChannel, channel.name);
        })
      );

      setSuccessMessage('User(s) added to channel successfully!');
      setSelectedChannel('');
    } catch (error) {
      console.error('Error adding users to channel:', error);
      if (axios.isAxiosError(error) && error.response) {
        setErrorMessage(error.response.data?.error || 'An error occurred');
      } else {
        setErrorMessage('An error occurred');
      }
    }
  };

  if (selectedUsers.length === 0) return null;

  return (
    <div
      style={{
        ...styles.addUserToTeamContainer,
        ...(theme === 'dark' && styles.addUserToTeamContainer['&.dark-mode'])
      }}
    >
      <h3
        style={{
          ...styles.addUserToTeamHeading,
          ...(theme === 'dark' && styles.addUserToTeamHeading['&.dark-mode'])
        }}
      >
        Add User(s) to Team
      </h3>

      {errorMessage && <div style={styles.addUserToTeamErrorMessage}>{errorMessage}</div>}
      {successMessage && <div style={styles.addUserToTeamSuccessMessage}>{successMessage}</div>}

      <select
        value={selectedTeam}
        onChange={e => setSelectedTeam(e.target.value)}
        style={{
          ...styles.addUserToTeamSelect,
          ...(theme === 'dark' && styles.addUserToTeamSelect['&.dark-mode'])
        }}
      >
        <option value="">Select a team</option>
        {Array.isArray(teams) && teams.length > 0 ? (
          teams.map(team => (
            <option key={team.name} value={team.name}>
              {team.name}
            </option>
          ))
        ) : (
          <option disabled>No teams available</option>
        )}
      </select>

      <button
        style={{
          ...styles.addUserToTeamButton,
          ...(theme === 'dark' && styles.addUserToTeamButton['&.dark-mode'])
        }}
        onClick={handleAddUserToTeam}
        disabled={!selectedTeam}
      >
        Add
      </button>

      <h3
        style={{
          ...styles.addUserToTeamHeading,
          ...(theme === 'dark' && styles.addUserToTeamHeading['&.dark-mode'])
        }}
      >
        Add User(s) to Channel
      </h3>
      <select
        style={{
          ...styles.addUserToTeamSelect,
          ...(theme === 'dark' && styles.addUserToTeamSelect['&.dark-mode'])
        }}
        value={selectedTeamToChannel}
        onChange={e => setSelectedTeamToChannel(e.target.value)}
      >
        <option value="">Select a team</option>
        {Array.isArray(teams) && teams.length > 0 ? (
          teams.map(team => (
            <option key={team.name} value={team.name}>
              {team.name}
            </option>
          ))
        ) : (
          <option disabled>No teams available</option>
        )}
      </select>
      <select
        value={selectedChannel}
        onChange={e => setSelectedChannel(e.target.value)}
        style={{
          ...styles.addUserToTeamSelect,
          ...(theme === 'dark' && styles.addUserToTeamSelect['&.dark-mode'])
        }}
      >
        <option value="">Select a channel</option>
        {Array.isArray(channels) && channels.length > 0 ? (
          channels.map(channel => (
            <option key={channel.name} value={channel.name}>
              {channel.name}
            </option>
          ))
        ) : (
          <option disabled>No channels available</option>
        )}
      </select>

      <button
        style={{
          ...styles.addUserToTeamButton,
          ...(theme === 'dark' && styles.addUserToTeamButton['&.dark-mode'])
        }}
        onClick={() => handleAddUserToChannel()}
        disabled={!selectedChannel}
      >
        Add
      </button>
    </div>
  );
};

export default ManageTeamMember;

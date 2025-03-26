import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTrash } from 'react-icons/fa';
import { IconType } from 'react-icons';
import styles from '../Styles/dashboardStyles.ts';
import { getTeams } from '../Services/dashboardService.ts';
import { deleteTeam } from '../Services/superAdminService.ts';
import { useTheme } from '../Context/ThemeContext.tsx';
import { useChatSelection } from '../Context/ChatSelectionContext.tsx';

const TrashIcon: IconType = FaTrash;

interface Team {
  _id: string;
  name: string;
}

interface TeamListProps {
  selectedUsers: string[];
  selectedTeam: string | null;
  setSelectedTeam: (teamName: string | null) => void;
}

const TeamList: React.FC<TeamListProps> = ({ selectedUsers, selectedTeam, setSelectedTeam }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const navigate = useNavigate();
  const { theme } = useTheme();

  const chatSelectionContext = useChatSelection();

  const handleDeleteTeam = async (team: Team) => {
    try {
      await deleteTeam(team.name);
      setTeams(prevTeams => prevTeams.filter(t => t.name !== team.name));

      // If the deleted team was selected, clear the selection
      if (selectedTeam === team.name) {
        setSelectedTeam(null);

        // Also clear the chat selection if using context
        if (chatSelectionContext) {
          chatSelectionContext.setSelection(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete team', err);
    }
  };

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const teamsList = await getTeams();
        setTeams(teamsList);
      } catch (err) {
        console.error('Failed to fetch teams', err);
      }
    };

    fetchTeams();
  }, []);

  return (
    <div style={{ ...styles.teamList, ...(theme === 'dark' && styles.teamList['&.dark-mode']) }}>
      <h3
        onClick={() => setCollapsed(!collapsed)}
        style={{ ...styles.listHeader, ...(theme === 'dark' && styles.listHeader['&.dark-mode']) }}
      >
        Teams {collapsed ? '▲' : '▼'}
      </h3>
      {!collapsed && (
        <ul
          style={{
            ...styles.listContainer,
            ...(theme === 'dark' && styles.listContainer['&.dark-mode'])
          }}
        >
          {teams.map((team, index) => (
            <li
              key={index}
              style={{
                ...styles.listItem,
                backgroundColor:
                  selectedTeam === team.name
                    ? theme === 'dark'
                      ? '#3A3F44'
                      : '#D3E3FC'
                    : 'transparent',
                fontWeight: selectedTeam === team.name ? 'bold' : 'normal',
                ...(theme === 'dark' && styles.listItem['&.dark-mode:hover'])
              }}
              onClick={() => setSelectedTeam(team.name)}
            >
              {team.name}
              <button
                style={{
                  ...styles.deleteTeamButton,
                  ...(theme === 'dark' && styles.deleteTeamButton['&.dark-mode'])
                }}
                onClick={e => {
                  e.stopPropagation();
                  handleDeleteTeam(team);
                }}
              >
                <TrashIcon
                  style={{
                    ...styles.trashIcon,
                    ...(theme === 'dark' && styles.trashIcon['&.dark-mode'])
                  }}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        style={{
          ...styles.createTeamButton,
          ...(theme === 'dark' && styles.createTeamButton['&.dark-mode'])
        }}
        onClick={() => navigate('/create-team', { state: { selectedUsers } })}
      >
        Create Team
      </button>
    </div>
  );
};

export default TeamList;

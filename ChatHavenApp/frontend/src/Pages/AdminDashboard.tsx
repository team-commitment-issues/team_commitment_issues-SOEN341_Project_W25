import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import UserList from '../Components/userList';
import TeamList from '../Components/TeamList';
import ChannelList from '../Components/ChannelList';
import Messaging from '../Components/Messaging';
import styles from '../Styles/dashboardStyles';
import TeamMemberList from '../Components/teamMemberList';
import { useTheme } from '../Context/ThemeContext';
import { ContextMenuState } from '../types/shared';
import StatusSelector from '../Components/UI/StatusSelector';
import { useUser } from '../Context/UserContext';
import { useChatSelection } from '../Context/ChatSelectionContext';

const AdminDashboard: React.FC = () => {
  const { userData } = useUser();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [refreshState, setRefreshState] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);

  const { selection, setSelection } = useChatSelection();

  const [usersContextMenu, setUsersContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    selected: ''
  });
  const [membersContextMenu, setMembersContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    selected: ''
  });
  const [messagesContextMenu, setMessagesContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    selected: ''
  });

  const handleRefresh = () => {
    setRefreshState(!refreshState);
  };

  const handleContextMenu = (type: string, arg: ContextMenuState) => {
    if (type === 'users') {
      setUsersContextMenu(arg);
      setMembersContextMenu({ visible: false, x: 0, y: 0, selected: '' });
      setMessagesContextMenu({ visible: false, x: 0, y: 0, selected: '' });
    }
    if (type === 'members') {
      setMembersContextMenu(arg);
      setUsersContextMenu({ visible: false, x: 0, y: 0, selected: '' });
      setMessagesContextMenu({ visible: false, x: 0, y: 0, selected: '' });
    }
    if (type === 'messages') {
      setMessagesContextMenu(arg);
      setUsersContextMenu({ visible: false, x: 0, y: 0, selected: '' });
      setMembersContextMenu({ visible: false, x: 0, y: 0, selected: '' });
    }
  };

  const handleTeamChange = (teamName: string | null) => {
    setSelectedTeam(teamName);
    setSelection(null);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSelection(null);
  }, [selectedTeam, setSelection]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getStyledComponent = useCallback(
    (baseStyle: any) => ({
      ...baseStyle,
      ...(theme === 'dark' && baseStyle['&.dark-mode'])
    }),
    [theme]
  );

  return (
    <div style={getStyledComponent(styles.container)}>
      <div style={{ position: 'absolute', top: 10, left: 10, fontWeight: 'bold' }}>
        {userData?.username ? `Welcome, ${userData.username}` : 'Loading...'}
      </div>
      <div style={getStyledComponent(styles.menuContainer)} ref={dropdownRef}>
        <button
          style={getStyledComponent(styles.menuButton)}
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          ☰ Menu
        </button>
        {dropdownOpen && (
          <div style={getStyledComponent(styles.dropdownMenu)}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #ccc' }}>
              <StatusSelector />
            </div>
            <button
              onClick={() => navigate('/profile')}
              style={getStyledComponent(styles.menuItem)}
            >
              Profile
            </button>
            <button
              onClick={() => navigate('/settings')}
              style={getStyledComponent(styles.menuItem)}
            >
              Settings
            </button>
            <button onClick={handleLogout} style={getStyledComponent(styles.menuItem)}>
              Logout
            </button>
          </div>
        )}
      </div>

      <h2 style={getStyledComponent(styles.heading)}>Dashboard</h2>
      <p style={getStyledComponent(styles.text)}>Manage users, teams, channels, and messages.</p>

      <div style={styles.mainContainer}>
        <UserList
          selectedUsers={selectedUsers}
          setSelectedUsers={setSelectedUsers}
          selectedTeam={selectedTeam}
          selection={selection}
          setSelection={setSelection}
          setSelectedTeamMembers={setSelectedTeamMembers}
          contextMenu={usersContextMenu}
          setContextMenu={(arg: ContextMenuState) => handleContextMenu('users', arg)}
          handleRefresh={handleRefresh}
        />

        <TeamMemberList
          selectedTeam={selectedTeam}
          selectedTeamMembers={selectedTeamMembers}
          setSelectedTeamMembers={setSelectedTeamMembers}
          selection={selection}
          setSelection={setSelection}
          contextMenu={membersContextMenu}
          setContextMenu={(arg: ContextMenuState) => handleContextMenu('members', arg)}
          refreshState={refreshState}
        />

        <div style={styles.middleContainer}>
          <TeamList
            selectedUsers={selectedUsers}
            selectedTeam={selectedTeam}
            setSelectedTeam={handleTeamChange}
          />
          <ChannelList
            selectedTeam={selectedTeam}
            selectedTeamMembers={selectedTeamMembers}
            selection={selection}
            setSelection={setSelection}
          />
        </div>

        <Messaging
          selection={selection}
          contextMenu={messagesContextMenu}
          setContextMenu={(arg: ContextMenuState) => handleContextMenu('messages', arg)}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;

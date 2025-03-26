import React, { useCallback, useEffect, useState } from 'react';
import styles from '../Styles/dashboardStyles';
import { getUsersInTeam, getUsersInChannel } from '../Services/dashboardService';
import { demoteToUser, promoteToAdmin, removeUserFromTeam } from '../Services/superAdminService';
import { removeUserFromChannel } from '../Services/channelService';
import ContextMenu from './UI/ContextMenu';
import { useTheme } from '../Context/ThemeContext';
import { Selection, ContextMenuState } from '../types/shared';
import { useOnlineStatus } from '../Context/OnlineStatusContext';
import UserStatusIndicator from './UI/UserStatusIndicator';
import { useChatSelection } from '../Context/ChatSelectionContext';

interface User {
  username: string;
  role: string;
}

interface TeamMemberListProps {
  selectedTeamMembers: string[];
  setSelectedTeamMembers: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTeam: string | null;
  selection: Selection | null;
  setSelection: (selection: Selection | null) => void;
  contextMenu: ContextMenuState;
  setContextMenu: (arg: ContextMenuState) => void;
  refreshState: boolean;
}

const TeamMemberList: React.FC<TeamMemberListProps> = ({
  selectedTeamMembers,
  setSelectedTeamMembers,
  selectedTeam,
  selection,
  setSelection,
  contextMenu,
  setContextMenu,
  refreshState
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [title, setTitle] = useState<string>('Users');
  const [selectedUserRole, setSelectedUserRole] = useState<string>('MEMBER');
  const { theme } = useTheme();
  const { refreshStatuses, subscribeToTeamStatuses, subscribeToChannelStatuses } =
    useOnlineStatus();
  const [fetchTrigger, setFetchTrigger] = useState(0); // Used to trigger fetches manually

  const chatSelectionContext = useChatSelection();

  const getCurrentChannel = useCallback(() => {
    return selection?.type === 'channel' ? selection.channelName : null;
  }, [selection]);

  const setSelectedDm = useCallback(
    (username: string | null) => {
      if (username && selectedTeam) {
        const dmSelection = {
          type: 'directMessage' as const,
          teamName: selectedTeam,
          username
        };

        // Update both the prop and context selection
        setSelection(dmSelection);
        if (chatSelectionContext) {
          chatSelectionContext.setSelection(dmSelection);
        }
      } else {
        setSelection(null);
        if (chatSelectionContext) {
          chatSelectionContext.setSelection(null);
        }
      }
    },
    [chatSelectionContext, selectedTeam, setSelection]
  );

  // Store stable references to functions that cause infinite loops when included as dependencies
  const statusFunctionsRef = React.useRef({
    refreshStatuses,
    subscribeToChannelStatuses,
    subscribeToTeamStatuses
  });

  // Update the refs when the functions change
  useEffect(() => {
    statusFunctionsRef.current = {
      refreshStatuses,
      subscribeToChannelStatuses,
      subscribeToTeamStatuses
    };
  }, [refreshStatuses, subscribeToChannelStatuses, subscribeToTeamStatuses]);

  // useEffect for fetching users - separate from other logic
  useEffect(() => {
    if (!selectedTeam) return;

    // Get current channel inside the effect to avoid dependency
    const selectedChannel = selection?.type === 'channel' ? selection.channelName : null;

    const fetchUserData = async () => {
      try {
        if (selectedChannel && selectedTeam) {
          setTitle('Channel Members');
          const channelMemberList = await getUsersInChannel(selectedTeam, selectedChannel);
          setUsers(channelMemberList);

          // Run status updates independently using the ref
          statusFunctionsRef.current
            .refreshStatuses(channelMemberList.map((user: { username: any }) => user.username))
            .catch(err => console.error('Error refreshing channel statuses:', err));

          // Handle subscription separately to avoid dependency loops
          try {
            statusFunctionsRef.current.subscribeToChannelStatuses(selectedTeam, selectedChannel);
          } catch (err) {
            console.error('Error subscribing to channel statuses:', err);
          }
        } else if (selectedTeam) {
          setTitle('Team Members');
          const teamMemberList = await getUsersInTeam(selectedTeam);
          setUsers(teamMemberList);

          // Run status updates independently using the ref
          statusFunctionsRef.current
            .refreshStatuses(teamMemberList.map((user: { username: any }) => user.username))
            .catch(err => console.error('Error refreshing team statuses:', err));

          // Handle subscription separately to avoid dependency loops
          try {
            statusFunctionsRef.current.subscribeToTeamStatuses(selectedTeam);
          } catch (err) {
            console.error('Error subscribing to team statuses:', err);
          }
        } else {
          setUsers([]);
        }
      } catch (err) {
        console.error('Failed to fetch users', err);
      }
    };

    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeam, selection, refreshState, fetchTrigger]); // Using eslint-disable for explicit control

  const handleRefreshUsers = useCallback(() => {
    setFetchTrigger(prev => prev + 1);
  }, []);

  const toggleTeamMemberSelection = useCallback(
    (user: string) => {
      setSelectedTeamMembers(previouslySelectedMembers =>
        previouslySelectedMembers.includes(user)
          ? previouslySelectedMembers.filter(u => u !== user)
          : [...previouslySelectedMembers, user]
      );
    },
    [setSelectedTeamMembers]
  );

  const handleContextMenu = useCallback(
    (event: any, { username, role }: { username: string; role: string }) => {
      event.preventDefault();
      setSelectedUserRole(role);
      setContextMenu({ visible: true, x: event.clientX, y: event.clientY, selected: username });
    },
    [setContextMenu]
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0, selected: '' });
  }, [setContextMenu]);

  // Handler functions for context menu items
  const handleRemoveFromTeam = useCallback(
    async (username: string) => {
      if (selectedTeam) {
        await removeUserFromTeam(username, selectedTeam);
        handleRefreshUsers();
      }
    },
    [selectedTeam, handleRefreshUsers]
  );

  const handleRemoveFromChannel = useCallback(
    async (username: string) => {
      const selectedChannel = getCurrentChannel();
      if (selectedTeam && selectedChannel) {
        await removeUserFromChannel(username, selectedTeam, selectedChannel);
        handleRefreshUsers();
      }
    },
    [selectedTeam, getCurrentChannel, handleRefreshUsers]
  );

  const handlePromoteToAdmin = useCallback(
    async (username: string) => {
      if (selectedTeam) {
        await promoteToAdmin(username, selectedTeam);
        handleRefreshUsers();
      }
    },
    [selectedTeam, handleRefreshUsers]
  );

  const handleDemoteToUser = useCallback(
    async (username: string) => {
      if (selectedTeam) {
        await demoteToUser(username, selectedTeam);
        handleRefreshUsers();
      }
    },
    [selectedTeam, handleRefreshUsers]
  );

  // Memoize menu items
  const getMenuItems = useCallback(() => {
    const menuItems = [
      {
        label: 'Remove User from Team',
        onClick: () => handleRemoveFromTeam(contextMenu.selected)
      },
      {
        label: 'Remove User from Channel',
        onClick: () => handleRemoveFromChannel(contextMenu.selected)
      },
      {
        label: 'Direct Message User',
        onClick: () => setSelectedDm(contextMenu.selected)
      }
    ];

    const adminOptions = [
      ...menuItems,
      {
        label: 'Demote User from Admin',
        onClick: () => handleDemoteToUser(contextMenu.selected)
      }
    ];

    const memberOptions = [
      ...menuItems,
      {
        label: 'Promote User to Admin',
        onClick: () => handlePromoteToAdmin(contextMenu.selected)
      }
    ];

    return selectedUserRole === 'ADMIN' ? adminOptions : memberOptions;
  }, [
    contextMenu.selected,
    handleRemoveFromTeam,
    handleRemoveFromChannel,
    setSelectedDm,
    handleDemoteToUser,
    handlePromoteToAdmin,
    selectedUserRole
  ]);

  const getStyledComponent = useCallback(
    (baseStyle: any) => ({
      ...baseStyle,
      ...(theme === 'dark' && baseStyle['&.dark-mode'])
    }),
    [theme]
  );

  if (!selectedTeam) {
    return null;
  }

  return (
    <div style={getStyledComponent(styles.userList)}>
      <h3 onClick={() => setCollapsed(!collapsed)} style={getStyledComponent(styles.listHeader)}>
        {title} {collapsed ? '▲' : '▼'}
      </h3>

      {!collapsed && (
        <ul style={getStyledComponent(styles.listContainer)}>
          {users.map(user => (
            <li
              key={user.username}
              onContextMenu={e => handleContextMenu(e, user)}
              value={user.username}
              style={{
                ...getStyledComponent(styles.listItem),
                backgroundColor: selectedTeamMembers.includes(user.username)
                  ? theme === 'dark'
                    ? '#3A3F44'
                    : '#D3E3FC'
                  : 'transparent',
                fontWeight: selectedTeamMembers.includes(user.username) ? 'bold' : 'normal'
              }}
              onClick={() => toggleTeamMemberSelection(user.username)}
            >
              <UserStatusIndicator username={user.username} size="small" />
              {user.username} - {user.role}
            </li>
          ))}
        </ul>
      )}
      {contextMenu.visible && (
        <ContextMenu
          items={getMenuItems()}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
};

export default TeamMemberList;

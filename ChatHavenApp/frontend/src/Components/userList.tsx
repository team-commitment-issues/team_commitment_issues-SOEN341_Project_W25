import React, { useEffect, useState, useCallback } from 'react';
import styles from '../Styles/dashboardStyles';
import { getUsers } from '../Services/dashboardService';
import ContextMenu from './UI/ContextMenu';
import { addUserToTeam } from '../Services/superAdminService';
import { addUserToChannel } from '../Services/channelService';
import { useTheme } from '../Context/ThemeContext';
import { useOnlineStatus } from '../Context/OnlineStatusContext';
import UserStatusIndicator from './UI/UserStatusIndicator';
import { Selection, ContextMenuState } from '../types/shared';
import { useChatSelection } from '../Context/ChatSelectionContext';
import { Status } from '../types/shared';

interface User {
  username: string;
}

interface UserListProps {
  selectedUsers: string[];
  setSelectedUsers: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTeam: string | null;
  selection: Selection | null;
  setSelection: (selection: Selection) => void;
  setSelectedTeamMembers: React.Dispatch<React.SetStateAction<string[]>>;
  contextMenu: ContextMenuState;
  setContextMenu: (arg: ContextMenuState) => void;
  handleRefresh: () => void;
}

const UserList: React.FC<UserListProps> = ({
  selectedUsers,
  setSelectedUsers,
  selectedTeam,
  selection,
  setSelection,
  setSelectedTeamMembers,
  contextMenu,
  setContextMenu,
  handleRefresh
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const { theme } = useTheme();
  const { refreshStatuses, getUserStatus } = useOnlineStatus();
  const [hasPermission, setHasPermission] = useState(true);
  const [fetchTrigger, setFetchTrigger] = useState(0); // Used to trigger fetches manually

  const chatSelectionContext = useChatSelection();

  const getCurrentChannel = useCallback(() => {
    return selection?.type === 'channel' ? selection.channelName : null;
  }, [selection]);

  // Store stable reference to refreshStatuses to prevent infinite loops
  const refreshStatusesRef = React.useRef(refreshStatuses);

  // Update the ref when refreshStatuses changes
  useEffect(() => {
    refreshStatusesRef.current = refreshStatuses;
  }, [refreshStatuses]);

  // Fetch users only once on component mount and when explicitly triggered
  useEffect(() => {
    if (!hasPermission) return;

    const fetchUserData = async () => {
      try {
        const usersList = await getUsers();
        setUsers(usersList);

        // Don't await this - it should run independently to avoid re-render loops
        // Use the ref instead of the function directly
        refreshStatusesRef
          .current(usersList.map((user: { username: any }) => user.username))
          .catch(err => console.error('Error refreshing statuses:', err));
      } catch (err: any) {
        if (err.message?.includes('Forbidden')) {
          setHasPermission(false);
        } else {
          setUsers([]);
        }
      }
    };

    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPermission, fetchTrigger]); // Only depend on permission and manual triggers

  const toggleUserSelection = useCallback(
    (user: string) => {
      setSelectedUsers(prevSelectedUsers =>
        prevSelectedUsers.includes(user)
          ? prevSelectedUsers.filter(u => u !== user)
          : [...prevSelectedUsers, user]
      );
      setSelectedTeamMembers([]);
    },
    [setSelectedUsers, setSelectedTeamMembers]
  );

  const handleContextMenu = useCallback(
    (event: React.MouseEvent, username: string) => {
      event.preventDefault();
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        selected: username
      });
    },
    [setContextMenu]
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0, selected: '' });
  }, [setContextMenu]);

  const handleAddUserToTeam = useCallback(
    async (username: string) => {
      if (selectedTeam) {
        await addUserToTeam(username, selectedTeam, 'MEMBER');
        setFetchTrigger(prev => prev + 1); // Trigger a refresh
        handleRefresh();
      }
    },
    [selectedTeam, handleRefresh]
  );

  const handleAddUserToChannel = useCallback(
    async (username: string) => {
      const selectedChannel = getCurrentChannel();
      if (selectedTeam && selectedChannel) {
        await addUserToChannel(username, selectedTeam, selectedChannel);
        setFetchTrigger(prev => prev + 1); // Trigger a refresh
        handleRefresh();
      }
    },
    [selectedTeam, getCurrentChannel, handleRefresh]
  );

  const handleDirectMessage = useCallback(
    (username: string) => {
      if (selectedTeam) {
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
      }
    },
    [selectedTeam, setSelection, chatSelectionContext]
  );

  // Memoize menu items to prevent unnecessary re-renders
  const menuItems = useCallback(
    () => [
      {
        label: 'Add User to Selected Team',
        onClick: () => handleAddUserToTeam(contextMenu.selected)
      },
      {
        label: 'Add User to Selected Channel',
        onClick: () => handleAddUserToChannel(contextMenu.selected)
      },
      {
        label: 'Direct Message User',
        onClick: () => handleDirectMessage(contextMenu.selected)
      }
    ],
    [contextMenu.selected, handleAddUserToTeam, handleAddUserToChannel, handleDirectMessage]
  );

  const formatLastSeen = useCallback((lastSeen?: Date) => {
    if (!lastSeen) return 'Unknown';

    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return lastSeen.toLocaleDateString();
  }, []);

  if (!users.length) {
    return null;
  }

  return (
    <div
      style={{
        ...styles.userList,
        ...(theme === 'dark' && styles.userList['&.dark-mode'])
      }}
    >
      <h3
        onClick={() => setCollapsed(!collapsed)}
        style={{
          ...styles.listHeader,
          ...(theme === 'dark' && styles.listHeader['&.dark-mode'])
        }}
      >
        Users {collapsed ? '▲' : '▼'}
      </h3>

      {!collapsed && (
        <ul
          style={{
            ...styles.listContainer,
            ...(theme === 'dark' && styles.listContainer['&.dark-mode'])
          }}
        >
          {users.map(user => {
            const userStatus = getUserStatus(user.username);
            const status = userStatus?.status || 'offline';

            return (
              <li
                key={user.username}
                onContextMenu={e => handleContextMenu(e, user.username)}
                style={{
                  ...styles.listItem,
                  backgroundColor: selectedUsers.includes(user.username)
                    ? theme === 'dark'
                      ? '#3A3F44'
                      : '#D3E3FC'
                    : 'transparent',
                  fontWeight: selectedUsers.includes(user.username) ? 'bold' : 'normal',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px',
                  color: theme === 'dark' ? '#FFF' : 'inherit'
                }}
                onClick={() => toggleUserSelection(user.username)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserStatusIndicator username={user.username} size="small" />
                  <span>{user.username}</span>
                </div>

                <span
                  style={{
                    fontSize: '12px',
                    color: theme === 'dark' ? '#AAA' : '#606770',
                    marginLeft: 'auto'
                  }}
                >
                  {status === Status.ONLINE
                    ? 'Online'
                    : status === Status.AWAY
                      ? 'Away'
                      : status === Status.BUSY
                        ? 'Busy'
                        : `Last seen: ${formatLastSeen(userStatus?.lastSeen)}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {contextMenu.visible && (
        <ContextMenu
          items={menuItems()}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
};

export default UserList;

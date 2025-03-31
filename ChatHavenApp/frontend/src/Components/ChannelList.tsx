import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTrash, FaLock } from 'react-icons/fa';
import { IconType } from 'react-icons';
import styles from '../Styles/dashboardStyles.ts';
import { deleteChannel, leaveChannel, requestChannelAccess, getAllChannels } from '../Services/channelService.ts';
import { useTheme } from '../Context/ThemeContext.tsx';
import { Selection, ContextMenuState } from '../types/shared.tsx';
import { useChatSelection } from '../Context/ChatSelectionContext.tsx';
import { useUser } from '../Context/UserContext.tsx';
import { getUsersInTeam } from '../Services/dashboardService.ts';
import ContextMenu from './UI/ContextMenu.tsx';

const TrashIcon: IconType = FaTrash;
const LockIcon: IconType = FaLock;

interface Channel {
  _id: string;
  name: string;
  hasAccess: boolean; // New property to track whether user has access
}

interface ChannelListProps {
  selectedTeam: string | null;
  selectedTeamMembers: string[];
  selection: Selection | null;
  setSelection: (selection: Selection | null) => void;
}

const ChannelList: React.FC<ChannelListProps> = ({
  selectedTeam,
  selection,
  setSelection,
  selectedTeamMembers
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [requestStatus, setRequestStatus] = useState<Record<string, string>>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    selected: ''
  });
  const [userTeamRole, setUserTeamRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { userData } = useUser();

  const chatSelectionContext = useChatSelection();

  const handleDeleteChannel = async (channelToDelete: Channel) => {
    try {
      await deleteChannel(selectedTeam!, channelToDelete.name);
      setChannels(prevChannels => prevChannels.filter(c => c.name !== channelToDelete.name));

      // If the deleted channel was selected, clear the selection
      if (selection?.type === 'channel' && selection.channelName === channelToDelete.name) {
        setSelection(null);
        if (chatSelectionContext) {
          chatSelectionContext.setSelection(null);
        }
      }

      // Check if any other selections are still valid
      if (chatSelectionContext) {
        chatSelectionContext.checkAndUpdateSelection();
      }
    } catch (err) {
      console.error('Failed to delete channel', err);
    }
  };

  const handleSetChannel = (channelName: string, hasAccess: boolean) => {
    // Allow access if user is admin in the team or has explicit access
    if (!hasAccess && !isAdminInCurrentTeam) {
      return;
    }

    if (selection?.type === 'channel' && selection.channelName === channelName) {
      // Deselect if clicking the same channel
      setSelection(null);
      if (chatSelectionContext) {
        chatSelectionContext.setSelection(null);
      }
      return;
    }

    if (selectedTeam) {
      const channelSelection = {
        type: 'channel' as const,
        channelName,
        teamName: selectedTeam
      };

      // Update both the prop and context selection
      setSelection(channelSelection);
      if (chatSelectionContext) {
        chatSelectionContext.setSelection(channelSelection);
      }
    }
  };

  const handleRequestAccess = async (channelName: string) => {
    try {
      if (!selectedTeam || !userData?.username) return;

      setRequestStatus(prev => ({ ...prev, [channelName]: 'pending' }));

      await requestChannelAccess(selectedTeam, channelName);

      setRequestStatus(prev => ({ ...prev, [channelName]: 'requested' }));

      setTimeout(() => {
        setRequestStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[channelName];
          return newStatus;
        });
      }, 3000);
    } catch (err) {
      console.error('Failed to request channel access', err);
      setRequestStatus(prev => ({ ...prev, [channelName]: 'failed' }));

      setTimeout(() => {
        setRequestStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[channelName];
          return newStatus;
        });
      }, 3000);
    }
  };

  const handleLeaveChannel = async () => {
    try {
      if (!selectedTeam || !contextMenu.selected) return;
      await leaveChannel(selectedTeam, contextMenu.selected); // Call the leaveChannel service
      setChannels(prevChannels =>
        prevChannels.map(channel =>
          channel.name === contextMenu.selected
            ? { ...channel, hasAccess: false }
            : channel
        )
      );
      if (selection?.type === 'channel' && selection.channelName === contextMenu.selected) {
        setSelection(null);
      }
      setContextMenu({ visible: false, x: 0, y: 0, selected: '' });
    } catch (err) {
      console.error('Failed to leave channel', err);
    }
  };

  const handleContextMenu = (event: React.MouseEvent, channel: Channel) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      selected: channel.name
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, selected: '' });
  };

  const isChannelSelected = (channelName: string) => {
    return selection?.type === 'channel' && selection.channelName === channelName;
  };

  // Fetch user's role in the current team
  useEffect(() => {
    const fetchUserTeamRole = async () => {
      if (!selectedTeam || !userData?.username) {
        setUserTeamRole(null);
        return;
      }

      try {
        const teamMembers = await getUsersInTeam(selectedTeam);
        const currentUser = teamMembers.find((member: { username: string }) =>
          member.username === userData.username
        );

        if (currentUser) {
          setUserTeamRole(currentUser.role);
        } else {
          setUserTeamRole(null);
        }
      } catch (err) {
        console.error('Failed to fetch user team role', err);
        setUserTeamRole(null);
      }
    };

    fetchUserTeamRole();
  }, [selectedTeam, userData?.username]);

  // Check if user is admin in current team
  const isAdminInCurrentTeam = userTeamRole === 'ADMIN' || userTeamRole === 'SUPER_ADMIN';

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        if (!selectedTeam) {
          setChannels([]);
          return;
        }

        // Now using getAllChannels which returns all channels with an access flag
        const channelsList = await getAllChannels(selectedTeam);
        setChannels(channelsList);

        // Verify if current selection is still valid
        if (chatSelectionContext) {
          chatSelectionContext.checkAndUpdateSelection();
        }
      } catch (err) {
        console.error('Failed to fetch channels', err);
        setChannels([]);
      }
    };

    fetchChannels();
  }, [selectedTeam, chatSelectionContext]);

  if (!selectedTeam) {
    return null;
  }

  const getContextMenuItems = (channelName: string) => {
    const selectedChannel = channels.find(c => c.name === channelName);
    if (!selectedChannel) return [];

    if (selectedChannel.hasAccess) {
      return [{ label: 'Leave Channel', onClick: handleLeaveChannel }];
    } else {
      return []; // No context menu options for locked channels
    }
  };

  return (
    <div
      style={{
        ...styles.channelList,
        ...(theme === 'dark' && styles.channelList['&.dark-mode'])
      }}
    >
      <h3
        onClick={() => setCollapsed(!collapsed)}
        style={{
          ...styles.listHeader,
          ...(theme === 'dark' && styles.listHeader['&.dark-mode'])
        }}
      >
        {selectedTeam ? `Channels for ${selectedTeam}` : 'Channels'} {collapsed ? '▲' : '▼'}
      </h3>
      {!collapsed && (
        <ul
          style={{
            ...styles.listContainer,
            ...(theme === 'dark' && styles.listContainer['&.dark-mode'])
          }}
        >
          {channels.map((channel, index) => (
            <li
              key={index}
              style={{
                ...styles.listItem,
                backgroundColor: isChannelSelected(channel.name)
                  ? theme === 'dark'
                    ? '#3A3F44'
                    : '#f0f0f0'
                  : 'transparent',
                fontWeight: isChannelSelected(channel.name) ? 'bold' : 'normal',
                ...(theme === 'dark' && styles.listItem['&.dark-mode:hover']),
                opacity: channel.hasAccess ? 1 : 0.7,
                cursor: channel.hasAccess ? 'pointer' : 'default',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              onClick={() => handleSetChannel(channel.name, channel.hasAccess)}
              onContextMenu={e => handleContextMenu(e, channel)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!channel.hasAccess && <LockIcon size={12} />}
                {channel.name}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {!channel.hasAccess && !requestStatus[channel.name] && !isAdminInCurrentTeam && (
                  <button
                    style={{
                      ...styles.actionButton,
                      ...(theme === 'dark' && styles.actionButton['&.dark-mode']),
                      fontSize: '10px',
                      padding: '2px 4px'
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      handleRequestAccess(channel.name);
                    }}
                  >
                    Request Access
                  </button>
                )}

                {requestStatus[channel.name] && (
                  <span style={{
                    fontSize: '10px',
                    color: requestStatus[channel.name] === 'failed' ? 'red' : 'green'
                  }}>
                    {requestStatus[channel.name] === 'pending'
                      ? 'Sending...'
                      : requestStatus[channel.name] === 'requested'
                        ? 'Request Sent!'
                        : 'Failed'}
                  </span>
                )}

                {/* Override access restriction for admins */}
                {!channel.hasAccess && isAdminInCurrentTeam && (
                  <span style={{
                    fontSize: '10px',
                    fontStyle: 'italic',
                    color: theme === 'dark' ? '#4CAF50' : '#2e7d32'
                  }}>
                    Admin Override
                  </span>
                )}

                {/* Only show delete button if user is admin or has access */}
                {(channel.hasAccess || isAdminInCurrentTeam) && (
                  <button
                    style={{
                      ...styles.deleteChannelButton,
                      ...(theme === 'dark' && styles.deleteChannelButton['&.dark-mode'])
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      handleDeleteChannel(channel);
                    }}
                  >
                    <TrashIcon
                      style={{
                        ...styles.trashIcon,
                        ...(theme === 'dark' && styles.trashIcon['&.dark-mode'])
                      }}
                    />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <button
        style={{
          ...styles.createChannelButton,
          ...(theme === 'dark' && styles.createChannelButton['&.dark-mode'])
        }}
        onClick={() =>
          navigate('/create-channel', { state: { selectedTeam, selectedTeamMembers } })
        }
      >
        Create Channel
      </button>
      {contextMenu.visible && (
        <ContextMenu
          items={getContextMenuItems(contextMenu.selected)}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
};

export default ChannelList;
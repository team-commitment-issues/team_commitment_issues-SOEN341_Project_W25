import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrash } from "react-icons/fa";
import { IconType } from "react-icons";
import styles from "../Styles/dashboardStyles";
import { getChannels } from "../Services/dashboardService";
import { leaveChannel } from "../Services/channelService";
import { useTheme } from "../Context/ThemeContext";
import { Selection, ContextMenuState } from "../types/shared";
import { useChatSelection } from "../Context/ChatSelectionContext";
import ContextMenu from "./UI/ContextMenu";

const TrashIcon: IconType = FaTrash;

interface Channel {
  _id: string;
  name: string;
}

interface ChannelListProps {
  selectedTeam: string | null;
  selectedTeamMembers: string[];
  selection: Selection | null;
  setSelection: (selection: Selection | null) => void;
}

const ChannelList: React.FC<ChannelListProps> = ({ selectedTeam, selection, setSelection, selectedTeamMembers }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    selected: "",
  });
  const navigate = useNavigate();
  const { theme } = useTheme();

  const handleDeleteChannel = async (channelToDelete: Channel) => {
    try {
      await deleteChannel(selectedTeam!, channelToDelete.name);
      setChannels((prevChannels) => prevChannels.filter((c) => c.name !== channelToDelete.name));
      
      // If the deleted channel was selected, clear the selection
      if (selection?.type === "channel" && selection.channelName === channelToDelete.name) {
        setSelection(null);
        if (chatSelectionContext) {
          chatSelectionContext.setSelection(null);
        }
      }
      
      // Check if any other selections are still valid
      if (chatSelectionContext) {
        chatSelectionContext.checkAndUpdateSelection();
      }
      if (!selectedTeam) return [];
      const channelsList = await getChannels(selectedTeam);
      setChannels(channelsList);
    } catch (err) {
      console.error("Failed to fetch channels", err);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [selectedTeam]);

  const handleSetChannel = (channelName: string) => {
    if (selection?.type === "channel" && selection.channelName === channelName) {
      // Deselect if clicking the same channel
      setSelection(null);
      return;
    }
    
    if (selectedTeam) {
      const channelSelection = { 
        type: "channel" as const, 
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

  const handleLeaveChannel = async () => {
    try {
      if (!selectedTeam || !contextMenu.selected) return;
      await leaveChannel(selectedTeam, contextMenu.selected); // Call the leaveChannel service
      setChannels((prevChannels) =>
        prevChannels.filter((channel) => channel.name !== contextMenu.selected)
      );
      if (selection?.type === "channel" && selection.channelName === contextMenu.selected) {
        setSelection(null);
      }
      setContextMenu({ visible: false, x: 0, y: 0, selected: "" });
    } catch (err) {
      console.error("Failed to leave channel", err);
    }
  };

  const handleContextMenu = (event: React.MouseEvent, channelName: string) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      selected: channelName,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, selected: "" });
  };

  const isChannelSelected = (channelName: string) => {
    return selection?.type === "channel" && selection.channelName === channelName;
  };

  if (!selectedTeam) {
    return null;
  }

  return (
    <div
      style={{
        ...styles.channelList,
        ...(theme === "dark" && styles.channelList["&.dark-mode"]),
      }}
    >
      <h3
        onClick={() => setCollapsed(!collapsed)}
        style={{
          ...styles.listHeader,
          ...(theme === "dark" && styles.listHeader["&.dark-mode"]),
        }}
      >
        {selectedTeam ? `Channels for ${selectedTeam}` : "Channels"}{" "}
        {collapsed ? "▲" : "▼"}
      </h3>
      {!collapsed && (
        <ul
          style={{
            ...styles.listContainer,
            ...(theme === "dark" && styles.listContainer["&.dark-mode"]),
          }}
        >
          {channels.map((channel, index) => (
            <li
              key={index}
              style={{
                ...styles.listItem,
                backgroundColor: isChannelSelected(channel.name) ? 
                  (theme === "dark" ? "#3A3F44" : "#f0f0f0") : 
                  "transparent",
                fontWeight: isChannelSelected(channel.name) ? "bold" : "normal",
                ...(theme === "dark" && styles.listItem["&.dark-mode:hover"]),
              }}
              onClick={() => handleSetChannel(channel.name)}
              onContextMenu={(e) => handleContextMenu(e, channel.name)}
            >
              {channel.name}
              <button
                style={{
                  ...styles.deleteChannelButton,
                  ...(theme === "dark" &&
                    styles.deleteChannelButton["&.dark-mode"]),
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLeaveChannel();
                }}
              >
                <TrashIcon
                  style={{
                    ...styles.trashIcon,
                    ...(theme === "dark" && styles.trashIcon["&.dark-mode"]),
                  }}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        style={{
          ...styles.createChannelButton,
          ...(theme === "dark" && styles.createChannelButton["&.dark-mode"]),
        }}
        onClick={() =>
          navigate("/create-channel", { state: { selectedTeam, selectedTeamMembers } })
        }
      >
        Create Channel
      </button>
      {contextMenu.visible && (
        <ContextMenu
          items={[
            { label: "Leave Channel", onClick: handleLeaveChannel },
          ]}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
};

export default ChannelList;
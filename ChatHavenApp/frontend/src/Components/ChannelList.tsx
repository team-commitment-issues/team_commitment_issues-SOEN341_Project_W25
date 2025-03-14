import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrash } from "react-icons/fa";
import { IconType } from "react-icons";
import styles from "../Styles/dashboardStyles";
import { getChannels } from "../Services/dashboardService";
import { deleteChannel } from "../Services/channelService";
import { useTheme } from "../Context/ThemeContext";

const TrashIcon: IconType = FaTrash;

interface Channel {
  _id: string;
  name: string;
}

interface ChannelListProps {
  selectedUsers: string[];
  setSelectedUsers: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTeam: string | null;
  setSelectedTeam: React.Dispatch<React.SetStateAction<string | null>>;
  selectedChannel: string | null;
  setSelectedChannel: React.Dispatch<React.SetStateAction<string | null>>;
  selectedTeamMembers: string[];
  setSelectedTeamMembers: React.Dispatch<React.SetStateAction<string[]>>;
}

const ChannelList: React.FC<ChannelListProps> = ({
  selectedUsers,
  setSelectedUsers,
  selectedTeam,
  setSelectedTeam,
  selectedChannel,
  setSelectedChannel,
  selectedTeamMembers,
  setSelectedTeamMembers,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const navigate = useNavigate();
  const { theme } = useTheme();

  const handleDeleteChannel = async (channelToDelete: Channel) => {
    try {
      await deleteChannel(selectedTeam!, channelToDelete.name);
      setChannels((prevChannels) => prevChannels.filter((c) => c.name !== channelToDelete.name));
      setSelectedChannel((prevSelectedChannel) =>
        prevSelectedChannel === channelToDelete.name ? null : prevSelectedChannel
      );
    } catch (err) {
      console.error("Failed to delete channel", err);
    }
  };

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        if (!selectedTeam) return [];
        const channelsList = await getChannels(selectedTeam);
        setChannels(channelsList);
      } catch (err) {
        console.error("Failed to fetch channels", err);
      }
    };

    fetchChannels();
  }, [selectedTeam]);

  const toggleChannelSelection = (channel: string) => {
    setSelectedChannel((prevSelectedChannel) =>
      prevSelectedChannel === channel ? null : channel
    );
    setSelectedUsers([]);
    setSelectedTeamMembers([]);
  };

  if (!selectedTeam) {
    return null;
  }

  return (
    <div style={{ ...styles.channelList, ...(theme === "dark" && styles.channelList["&.dark-mode"]) }}>
      <h3 onClick={() => setCollapsed(!collapsed)} style={{ ...styles.listHeader, ...(theme === "dark" && styles.listHeader["&.dark-mode"]) }}>
        {selectedTeam ? `Channels for ${selectedTeam}` : "Channels"} {collapsed ? "▲" : "▼"}
      </h3>
      {!collapsed && (
        <ul style={{ ...styles.listContainer, ...(theme === "dark" && styles.listContainer["&.dark-mode"]) }}>
          {channels.map((channel, index) => (
            <li
              key={index}
              style={{
                ...styles.listItem,
                backgroundColor: selectedChannel === channel.name ? "#f0f0f0" : "transparent",
                fontWeight: selectedChannel === channel.name ? "bold" : "normal",
                ...(theme === "dark" && styles.listItem["&.dark-mode:hover"]),
              }}
              onClick={() => toggleChannelSelection(channel.name)}
            >
              {channel.name}
              <button
                style={{ ...styles.deleteChannelButton, ...(theme === "dark" && styles.deleteChannelButton["&.dark-mode"]) }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteChannel(channel);
                }}
              >
                <TrashIcon style={{ ...styles.trashIcon, ...(theme === "dark" && styles.trashIcon["&.dark-mode"]) }} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        style={{ ...styles.createChannelButton, ...(theme === "dark" && styles.createChannelButton["&.dark-mode"]) }}
        onClick={() => navigate("/create-channel", { state: { selectedTeam, selectedTeamMembers } })}
      >
        Create Channel
      </button>
    </div>
  );
};

export default ChannelList;

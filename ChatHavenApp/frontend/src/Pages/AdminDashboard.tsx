import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserList from "../Components/userList";
import TeamList from "../Components/TeamList";
import ChannelList from "../Components/ChannelList";
import Messaging from "../Components/Messaging";
import styles from "../Styles/dashboardStyles";
import TeamMemberList from "../Components/teamMemberList";
import { useTheme } from "../Context/ThemeContext";
import { Selection, ContextMenuState } from "../types/shared";

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [refreshState, setRefreshState] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  
  // Unified selection for channels and DMs
  const [selection, setSelection] = useState<Selection>(null);
  
  // Context menu states
  const [usersContextMenu, setUsersContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, selected: "" });
  const [membersContextMenu, setMembersContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, selected: "" });
  const [messagesContextMenu, setMessagesContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, selected: "" });

  const handleRefresh = () => {
    setRefreshState(!refreshState);
  };

  const handleContextMenu = (type: string, arg: ContextMenuState) => {
    if (type === "users") {
      setUsersContextMenu(arg);
      setMembersContextMenu({ visible: false, x: 0, y: 0, selected: "" });
      setMessagesContextMenu({ visible: false, x: 0, y: 0, selected: "" });
    }
    if (type === "members") {
      setMembersContextMenu(arg);
      setUsersContextMenu({ visible: false, x: 0, y: 0, selected: "" });
      setMessagesContextMenu({ visible: false, x: 0, y: 0, selected: "" });
    }
    if (type === "messages") {
      setMessagesContextMenu(arg);
      setUsersContextMenu({ visible: false, x: 0, y: 0, selected: "" });
      setMembersContextMenu({ visible: false, x: 0, y: 0, selected: "" });
    }
  }

  // Update team selection to also clear the selection
  const handleTeamChange = (teamName: string | null) => {
    setSelectedTeam(teamName);
    setSelection(null);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // When team changes, clear the selection
  useEffect(() => {
    setSelection(null);
  }, [selectedTeam]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div style={{ ...styles.container, ...(theme === "dark" && styles.container["&.dark-mode"]) }}>
      <div style={{ ...styles.menuContainer, ...(theme === "dark" && styles.menuContainer["&.dark-mode"]) }} ref={dropdownRef}>
        <button
          style={{ ...styles.menuButton, ...(theme === "dark" && styles.menuButton["&.dark-mode"]) }}
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          ☰ Menu
        </button>
        {dropdownOpen && (
          <div style={{ ...styles.dropdownMenu, ...(theme === "dark" && styles.dropdownMenu["&.dark-mode"]) }}>
            <button onClick={() => navigate("/profile")} style={{ ...styles.menuItem, ...(theme === "dark" && styles.menuItem["&.dark-mode:hover"]) }}>
              Profile
            </button>
            <button
              onClick={() => navigate("/settings")}
              style={{ ...styles.menuItem, ...(theme === "dark" && styles.menuItem["&.dark-mode:hover"]) }}
            >
              Settings
            </button>
            <button onClick={handleLogout} style={{ ...styles.menuItem, ...(theme === "dark" && styles.menuItem["&.dark-mode:hover"]) }}>
              Logout
            </button>
          </div>
        )}
      </div>

      <h2 style={{ ...styles.heading, ...(theme === "dark" && styles.heading["&.dark-mode"]) }}>Dashboard</h2>
      <p style={{ ...styles.text, ...(theme === "dark" && styles.text["&.dark-mode"]) }}>Manage users, teams, channels, and messages.</p>

      <div style={styles.mainContainer}>
        <UserList 
          selectedUsers={selectedUsers}
          setSelectedUsers={setSelectedUsers}
          selectedTeam={selectedTeam}
          selection={selection}
          setSelectedTeamMembers={setSelectedTeamMembers}
          contextMenu={usersContextMenu}
          setContextMenu={(arg: ContextMenuState) => handleContextMenu("users", arg)}
          handleRefresh={handleRefresh}
        />
        
        <TeamMemberList
          selectedTeam={selectedTeam}
          selectedTeamMembers={selectedTeamMembers}
          setSelectedTeamMembers={setSelectedTeamMembers}
          selection={selection}
          setSelection={setSelection}
          contextMenu={membersContextMenu}
          setContextMenu={(arg: ContextMenuState) => handleContextMenu("members", arg)}
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
          setContextMenu={(arg: ContextMenuState) => handleContextMenu("messages", arg)}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
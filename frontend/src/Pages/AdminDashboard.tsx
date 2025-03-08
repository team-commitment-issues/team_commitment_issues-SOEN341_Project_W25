import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserList from "../Components/userList";
import TeamList from "../Components/TeamList";
import ChannelList from "../Components/ChannelList";
import TeamMessages from "../Components/DirectMessages";
import styles from "../Styles/dashboardStyles";
import TeamMemberList from "../Components/teamMemberList";

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [refreshState, setRefreshState] = useState(false);
  const [selectedDM, setSelectedDM] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [usersContextMenu, setUsersContextMenu] = useState<{ visible: boolean; x: number; y: number; selected: string }>({ visible: false, x: 0, y: 0, selected: "" });
  const [membersContextMenu, setMembersContextMenu] = useState<{ visible: boolean; x: number; y: number; selected: string }>({ visible: false, x: 0, y: 0, selected: "" });
  const [messagesContextMenu, setMessagesContextMenu] = useState<{ visible: boolean; x: number; y: number; selected: string }>({ visible: false, x: 0, y: 0, selected: "" });

  const handleRefresh = () => {
    setRefreshState(!refreshState);
  };

  const handleContextMenu = (type: string, arg: { visible: boolean; x: number; y: number; selected: string }) => {
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

  useEffect(() => {
    setSelectedChannel(null);
  }, [selectedDM]);

  useEffect(() => {
    setSelectedDM(null);
  }, [selectedChannel]);

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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div style={styles.container}>
      <div style={styles.menuContainer} ref={dropdownRef}>
        <button
          style={styles.menuButton}
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          ☰ Menu
        </button>
        {dropdownOpen && (
          <div style={styles.dropdownMenu}>
            <button onClick={() => navigate("/profile")} style={styles.menuItem}>
              Profile
            </button>
            <button
              onClick={() => navigate("/settings")}
              style={styles.menuItem}
            >
              Settings
            </button>
            <button onClick={handleLogout} style={styles.menuItem}>
              Logout
            </button>
          </div>
        )}
      </div>

      <h2 style={styles.heading}>Dashboard</h2>
      <p style={styles.text}>Manage users, teams, channels, and messages.</p>

      <div style={styles.mainContainer}>
        <UserList 
          selectedUsers={selectedUsers}
          setSelectedUsers={setSelectedUsers}
          selectedTeam={selectedTeam}
          setSelectedTeam={setSelectedTeam}
          selectedChannel={selectedChannel} 
          setSelectedChannel={setSelectedChannel}
          setSelectedTeamMembers={setSelectedTeamMembers}
          contextMenu={usersContextMenu}
          setContextMenu={(arg: { visible: boolean; x: number; y: number; selected: string }) => handleContextMenu("users", arg)}
          handleRefresh={handleRefresh}
        />
        
        <TeamMemberList
          selectedTeamMembers={selectedTeamMembers}
          setSelectedTeamMembers={setSelectedTeamMembers}
          selectedTeam={selectedTeam}
          selectedChannel={selectedChannel} 
          contextMenu={membersContextMenu}
          setContextMenu={(arg: { visible: boolean; x: number; y: number; selected: string }) => handleContextMenu("members", arg)}
          setSelectedDm={setSelectedDM}
          refreshState={refreshState}
        />

        <div style={styles.middleContainer}>
          <TeamList
            selectedUsers={selectedUsers} 
            setSelectedUsers={setSelectedUsers}
            selectedTeam={selectedTeam}
            setSelectedTeam={setSelectedTeam} 
            selectedChannel={selectedChannel} 
            setSelectedChannel={setSelectedChannel}
            setSelectedTeamMembers={setSelectedTeamMembers}
          />
          <ChannelList
            selectedUsers={selectedUsers} 
            setSelectedUsers={setSelectedUsers}
            selectedTeam={selectedTeam} 
            setSelectedTeam={setSelectedTeam} 
            selectedChannel={selectedChannel} 
            setSelectedChannel={setSelectedChannel}
            selectedTeamMembers={selectedTeamMembers}
            setSelectedTeamMembers={setSelectedTeamMembers}
          />
        </div>
        
        <TeamMessages 
          selectedTeam={selectedTeam} 
          selectedChannel={selectedChannel}
          contextMenu={messagesContextMenu}
          setContextMenu={(arg: { visible: boolean; x: number; y: number; selected: string }) => handleContextMenu("messages", arg)}
          selectedDM={selectedDM}
          setSelectedDM={setSelectedDM}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;

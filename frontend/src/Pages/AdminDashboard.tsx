import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserList from "../Components/userList";
import TeamList from "../Components/TeamList";
import ChannelList from "../Components/ChannelList";
import DirectMessages from "../Components/DirectMessages";
import AddUserToTeam from "../Components/AddUserToTeam";
import styles from "../Styles/dashboardStyles";
import TeamMemberList from "../Components/teamMemberList";

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);

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

      <h2 style={styles.heading}>Ultimate Admin Dashboard</h2>
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
        />

        <AddUserToTeam selectedUsers={selectedUsers} />
        
        <TeamMemberList
          selectedTeamMembers={selectedTeamMembers}
          setSelectedTeamMembers={setSelectedTeamMembers}
          selectedTeam={selectedTeam}
          selectedChannel={selectedChannel} 
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
        
        <DirectMessages />
      </div>
    </div>
  );
};

export default AdminDashboard;

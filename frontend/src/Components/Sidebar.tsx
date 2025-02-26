import React from 'react';
import { SidebarContainer, Button } from '../Styles/MainDashboardNormalUserStyles';

interface SidebarProps {
    teams: { [key: string]: string[] };
    selectedTeam: string;
    onTeamClick: (team: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ teams, selectedTeam, onTeamClick }) => {
    return (
        <SidebarContainer>
            {Object.keys(teams).map((team) => (
                <Button
                    key={team}
                    onClick={() => onTeamClick(team)}
                    selected={selectedTeam === team}
                >
                    <div className="team-icon"></div>
                    {team}
                </Button>
            ))}
        </SidebarContainer>
    );
};

export default Sidebar;
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTeam } from '../Services/superAdminService';
import "../Styles/CreateTeamPage.css";


const CreateTeam: React.FC = () => {
    const [teamName, setTeamName] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            alert('Team created successfully');
            navigate('/dashboard');
        } catch (err) {
            alert('Failed to create team');
        }
    };

    return (
        <div className="container">
            <h2>Create a New Team</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="teamName">Team Name:</label>
                    <input
                        type="text"
                        id="teamName"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="submit-button">Create Team</button>
            </form>
        </div>
    );
};

export default CreateTeam;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTeam, getUsers } from '../Services/superAdminService';
import "../Styles/CreateTeamPage.css";

interface User {
    _id: string;
    userID: string;
}

const CreateTeam: React.FC = () => {
    const [teamName, setTeamName] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const usersList = await getUsers();
                setUsers(usersList);
            } catch (err) {
                console.error('Failed to fetch users', err);
            }
        };

        fetchUsers();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await createTeam(teamName, selectedUsers);
            alert('Team created successfully');
            navigate('/dashboard');
        } catch (err) {
            alert('Failed to create team');
        }
    };

    const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
        setSelectedUsers(selectedOptions);
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
                <div className="form-group">
                    <label htmlFor="users">Select Users:</label>
                    <select
                        id="users"
                        multiple
                        value={selectedUsers}
                        onChange={handleUserChange}
                        required
                    >
                        {users.map(user => (
                            <option key={user._id} value={user._id}>
                                {user.userID}
                            </option>
                        ))}
                    </select>
                </div>
                <button type="submit" className="submit-button">Create Team</button>
            </form>
        </div>
    );
};

export default CreateTeam;
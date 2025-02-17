import { TeamRole } from '../enums';
import Channel from '../models/Channel';
import User from '../models/User';
import Team from '../models/Team';
import TeamMember from '../models/TeamMember';
import { ObjectId } from 'mongoose';

class SuperAdminService {
    static async createTeam(name: string, createdByUserID: string): Promise<any> {
        const possibleTeam = await Team.findOne({ name });
        if (possibleTeam) {
            throw new Error('Team already exists');
        }

        const team = new Team({
            name,
            createdBy: createdByUserID,
        });

        await team.save();
        await SuperAdminService.addUserToTeam(createdByUserID, team._id as string, TeamRole.ADMIN);

        return team;
    }

    static async addUserToTeam(userID: string, teamID: string, role: TeamRole): Promise<any> {
        const team = await Team.findById(teamID);
        if (!team) {
            throw new Error('Team not found');
        }
        const user = await User.findById(userID);
        if (!user) {
            throw new Error('User not found');
        }
        
        const teamMember = new TeamMember({
            user: userID,
            team: teamID,
            role: role,
        });

        await teamMember.save();

        user.teamMemberships.push(teamMember._id as ObjectId);

        return teamMember;
    }
}

export default SuperAdminService;
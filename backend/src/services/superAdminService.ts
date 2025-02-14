import { TeamRole } from '../enums';
import Channel from '../models/Channel';
import User from '../models/User';
import Team from '../models/Team';
import TeamMember from '../models/TeamMember';
import { ObjectId } from 'mongoose';

class SuperAdminService {
    static async createTeam(name: string, createdByUserID: string): Promise<any> {
        const team = new Team({
            name,
            createdBy: createdByUserID,
        });

        await team.save();

        const teamMember = new TeamMember({
            user: createdByUserID,
            team: team._id,
            role: TeamRole.ADMIN,
        });

        await teamMember.save();

        const user = await User.findById(createdByUserID);
        if (!user) {
            throw new Error('User not found');
        }
        user.teamMemberships.push(teamMember._id as ObjectId);
        await user.save();

        return team;
    }

    static async addUserToTeam(userID: string, teamID: string, teamRole: TeamRole): Promise<any> {
        /* TODO: Implement this method */
        return null;
    }
}

export default SuperAdminService;
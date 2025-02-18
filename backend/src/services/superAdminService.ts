import { TeamRole } from '../enums';
import Channel from '../models/Channel';
import User from '../models/User';
import Team from '../models/Team';
import TeamMember from '../models/TeamMember';
import { ObjectId } from 'mongoose';
import { Message } from '../models/Message';

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

    static async removeUserFromTeam(userID: string, teamID: string): Promise<any> {
        try {
            const user = await User.findOne({ userID });
            if (!user) throw new Error('User not found');
            const teamMember = await TeamMember.findOne({ user: user?._id, team: teamID });
            const membershipId = teamMember?._id as ObjectId;
            if (!teamMember) throw new Error('User is not a member of the team');
            await teamMember.deleteOne();
            
            user.teamMemberships = user.teamMemberships.filter((id) => id.toString() !== membershipId.toString());

            await user.save();

            const team = await Team.findById(teamID);
            if (!team) throw new Error('Team not found');
            team.teamMembers = team.teamMembers.filter((id) => id.toString() !== membershipId.toString());

            await team.save();
            
            return { message: 'User removed from team successfully' };
        } catch (error) {
            throw new Error(`Error removing user from team: ${(error as Error).message}`);
        }
    }

    static async deleteTeam(teamID: string): Promise<any> {
        try {
            const team = await Team.findById(teamID);
            if (!team) throw new Error('Team not found');

            const memberships = await TeamMember.find({ team: teamID });
            for (const membership of memberships) {
                const user = await User.findByIdAndUpdate(membership.user, {
                    $pull: { teamMemberships: membership._id },
                });
                if (user) {
                    await user?.save();
                }
            }

            await TeamMember.deleteMany({ team: teamID });

            const channels = await Channel.find({ team: teamID });
            for (const channel of channels) {
                await Message.deleteMany({ channel: channel._id });
            }
            await Channel.deleteMany({ team: teamID });

            await Team.findByIdAndDelete(teamID);

            return { message: 'Team deleted successfully' };
        } catch (error) {
            throw new Error(`Error deleting team: ${(error as Error).message}`);
        }
    }
}

export default SuperAdminService;
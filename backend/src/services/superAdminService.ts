import { Role, TeamRole } from '../enums';
import Channel from '../models/Channel';
import User from '../models/User';
import Team from '../models/Team';
import TeamMember from '../models/TeamMember';
import { ObjectId, Schema, Types } from 'mongoose';
import { Message } from '../models/Message';

class SuperAdminService {
    static async createTeam(teamName: string, createdByUserID: Types.ObjectId, username: string): Promise<any> {
        const possibleTeam = await Team.findOne({ name: teamName });
        if (possibleTeam) {
            throw new Error('Team already exists');
        }

        const team = new Team({
            name: teamName,
            createdBy: createdByUserID,
        });

        await team.save();
        await SuperAdminService.addUserToTeam(username, team._id as Schema.Types.ObjectId, TeamRole.ADMIN);

        return team;
    }

    static async addUserToTeam(userName: string, teamId: Schema.Types.ObjectId, role: TeamRole): Promise<any> {
        const user = await User.findOne({ username: userName });
        if (!user) {
            throw new Error('User not found');
        }

        if (user.teamMemberships.includes(teamId)) {
            throw new Error('User is already a member of the team');
        }

        const team = await Team.findById(teamId);
        if (!team) {
            throw new Error('Team not found');
        }

        const teamMember = new TeamMember({
            user: user._id,
            team: teamId,
            role: role,
        });

        await teamMember.save();

        user.teamMemberships.push(teamMember._id as ObjectId);
        await user.save();

        team.teamMembers.push(teamMember._id as ObjectId);
        await team.save();

        return teamMember;
    }

    static async removeUserFromTeam(username: string, teamId: Types.ObjectId): Promise<any> {
        const user = await User.findOne({ username });
        if (!user) throw new Error('User not found');

        const team = await Team.findById(teamId);
        if (!team) throw new Error('Team not found');

        const teamMember = await TeamMember.findOne({ user: user._id, team: team._id });
        if (!teamMember) throw new Error('User is not a member of the team');

        await teamMember.deleteOne();
        const membershipId = teamMember?._id as ObjectId;

        user.teamMemberships = user.teamMemberships.filter((id) => id.toString() !== membershipId.toString());

        await user.save();

        team.teamMembers = team.teamMembers.filter((id) => id.toString() !== membershipId.toString());

        return await team.save();;
    }

    static async deleteTeam(teamId: Types.ObjectId): Promise<any> {

        const team = await Team.findById(teamId);
        if (!team) throw new Error('Team not found');

        const memberships = await TeamMember.find({ team: teamId });
        for (const membership of memberships) {
            const user = await User.findByIdAndUpdate(membership.user, {
                $pull: { teamMemberships: membership._id },
            });
            if (user) {
                await user.save();
            }
        }

        await TeamMember.deleteMany({ team: teamId });

        const channels = await Channel.find({ team: teamId });
        for (const channel of channels) {
            await Message.deleteMany({ channel: channel._id });
        }
        await Channel.deleteMany({ team: teamId });

        return await Team.findByIdAndDelete(teamId);;
    }
}

export default SuperAdminService;
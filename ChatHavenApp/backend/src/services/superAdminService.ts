import { Role, TeamRole, DefaultChannels } from '../enums';
import Channel from '../models/Channel';
import User from '../models/User';
import Team from '../models/Team';
import TeamMember from '../models/TeamMember';
import { ObjectId, Schema, Types } from 'mongoose';
import { Message } from '../models/Message';
import ChannelService from './channelService';

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
        
        for (const channel of Object.values(DefaultChannels)) {
            await ChannelService.createChannel(team._id as Types.ObjectId, channel, createdByUserID, username, Role.SUPER_ADMIN, []);
        }
        
        await SuperAdminService.addUserToTeam(username, team._id as Schema.Types.ObjectId, TeamRole.ADMIN);
        return team;
    }

    static async addUserToTeam(userName: string, teamId: Schema.Types.ObjectId, role: TeamRole): Promise<any> {
        const user = await User.findOne({ username: userName });
        if (!user) {
            throw new Error('User not found');
        }
    
        const team = await Team.findById(teamId);
        if (!team) {
            throw new Error('Team not found');
        }
    
        const existingMembership = await TeamMember.findOne({ user: user._id, team: teamId });
        if (existingMembership) {
            throw new Error('User is already a member of the team');
        }
    
        try {
            const teamMember = new TeamMember({
                user: user._id,
                team: teamId,
                role: role,
                channels: [],
                directMessages: []
            });
    
            await teamMember.save();

            user.teamMemberships.push(teamMember._id as ObjectId);
            await user.save();
    
            team.teamMembers.push(teamMember._id as ObjectId);
            await team.save();
    
            if (user.role !== Role.SUPER_ADMIN) {
                try {
                    const channels = await Channel.find({ 
                        team: teamId,
                        name: { $in: Object.values(DefaultChannels) }
                    });
                    
                    for (const channel of channels) {
                        channel.members.push(teamMember._id as Schema.Types.ObjectId);
                        await channel.save();
                        
                        teamMember.channels.push(channel._id as Schema.Types.ObjectId);
                    }
                    
                    if (channels.length > 0) {
                        await teamMember.save();
                    }
                } catch (channelError) {
                    console.error('Error adding user to channels:', channelError);
                }
            }
    
            return teamMember;
        } catch (error) {
            console.error('Error in addUserToTeam:', error);
            throw error;
        }
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

    static async promoteToAdmin(username: string, teamId: Types.ObjectId): Promise<any> {
        const user = await User.findOne({ username: { $eq: username } });
        if (!user) throw new Error('User not found');

        const team = await Team.findById(teamId);
        if (!team) throw new Error('Team not found');

        const teamMember = await TeamMember.findOne({ user: user._id, team: team._id });
        if (!teamMember) throw new Error('User is not a member of the team');

        teamMember.role = TeamRole.ADMIN;
        return await teamMember.save();
    }

    static async demoteToUser(username: string, teamId: Types.ObjectId): Promise<any> {
        const user = await User.findOne({ username: { $eq: username } });
        if (!user) throw new Error('User not found');

        const team = await Team.findById(teamId);
        if (!team) throw new Error('Team not found');

        const teamMember = await TeamMember.findOne({ user: user._id, team: team._id });
        if (!teamMember) throw new Error('User is not a member of the team');

        teamMember.role = TeamRole.MEMBER;
        return await teamMember.save();
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
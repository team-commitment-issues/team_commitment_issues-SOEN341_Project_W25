import Team from '../models/Team';
import Channel from '../models/Channel';
import User from '../models/User';
import { Schema, Types } from 'mongoose';
import { Role, TeamRole } from '../enums';
import TeamMember from '../models/TeamMember';

class DashboardService {
  static async listTeams(role: Role, teamMemberships: Schema.Types.ObjectId[]): Promise<any> {
    if (role === Role.SUPER_ADMIN) {
      const teams = await Team.find().select('name');
      return teams;
    }
    const teams: Array<{ name: string }> = [];
    for (const teamMemberId of teamMemberships) {
      const teamMember = await TeamMember.findOne({ _id: teamMemberId }).select('team');
      const team = await Team.findOne({ _id: teamMember!.team }).select('name');
      if (team) teams.push(team);
    }

    return teams;
  }

  static async listChannels(
    role: Role,
    team: Types.ObjectId,
    teamMember: Types.ObjectId | null
  ): Promise<any> {
    if (role === Role.SUPER_ADMIN) {
      const channels = await Channel.find({ team: team }).select('name');
      return channels;
    }

    const channels = await Channel.find({ team: team, members: teamMember }).select('name');
    return channels;
  }

  static async listUsers(username: string): Promise<any> {
    const users = (await User.find().select('username')).filter(user => user.username !== username);
    return users;
  }

  static async listTeamUsers(team: Types.ObjectId): Promise<any> {
    const teamData = await Team.findOne({ _id: team }).select('teamMembers');
    if (!teamData) return [];
    const teamMembers = await TeamMember.find({ _id: { $in: teamData.teamMembers } }).select(
      'user role -_id'
    );
    const userIds = teamMembers.map(member => member.user);
    const users = await User.find({ _id: { $in: userIds } });

    const result = users
      .map(user => {
        const member = teamMembers.find(member => String(member.user) === String(user._id));
        return {
          username: user.username,
          role: member?.role
        };
      })
      .sort((a, b) => {
        if (a.role === TeamRole.ADMIN && b.role !== TeamRole.ADMIN) return -1;
        if (a.role !== TeamRole.ADMIN && b.role === TeamRole.ADMIN) return 1;
        return 0;
      });

    return result;
  }

  static async listChannelUsers(channel: Types.ObjectId): Promise<any> {
    const channelData = await Channel.findOne({ _id: channel }).select('members');
    if (!channelData) return [];
    const teamMembers = await TeamMember.find({ _id: { $in: channelData.members } }).select(
      'user role -_id'
    );
    const userIds = teamMembers.map(member => member.user);
    const users = await User.find({ _id: { $in: userIds } });

    const result = users
      .map(user => {
        const member = teamMembers.find(member => String(member.user) === String(user._id));
        return {
          username: user.username,
          role: member?.role
        };
      })
      .sort((a, b) => {
        if (a.role === TeamRole.ADMIN && b.role !== TeamRole.ADMIN) return -1;
        if (a.role !== TeamRole.ADMIN && b.role === TeamRole.ADMIN) return 1;
        return 0;
      });

    return result;
  }
}

export default DashboardService;

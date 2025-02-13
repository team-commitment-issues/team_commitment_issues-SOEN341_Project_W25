import { Role, Permission } from '../enums';
import Channel from '../models/Channel';
import ChannelMember from '../models/ChannelMember';
import User from '../models/User';
import Team from '../models/Team';
import TeamMember from '../models/TeamMember';

class SuperAdminService {
    static async createTeam(name: string, createdByUserID: string): Promise<any> {
        /* TODO: Implement this method */
        return null;
    }

    static async addUserToTeam(userID: string, teamID: string, role: Role): Promise<any> {
        /* TODO: Implement this method */
        return null;
    }
}

export default SuperAdminService;
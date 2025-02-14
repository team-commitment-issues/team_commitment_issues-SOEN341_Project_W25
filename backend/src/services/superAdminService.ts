import { TeamRole } from '../enums';
import Channel from '../models/Channel';
import User from '../models/User';
import Team from '../models/Team';
import TeamMember from '../models/TeamMember';

class SuperAdminService {
    static async createTeam(name: string, createdByUserID: string): Promise<any> {
        /* TODO: Implement this method */
        return null;
    }

    static async addUserToTeam(userID: string, teamID: string, teamRole: TeamRole): Promise<any> {
        /* TODO: Implement this method */
        return null;
    }
}

export default SuperAdminService;
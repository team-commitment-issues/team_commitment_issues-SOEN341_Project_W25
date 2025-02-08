import { Request, Response, NextFunction } from 'express';
import { Permission } from '../enums';

function checkPermission(permission: Permission) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (!req.user) {
            res.status(401).json({'Unauthorized': 'No token provided'});
            return;
        }
        const user = req.user;
        const channelID = req.params.channelID;

        if (user.role === 'ADMIN') {
            return next();
        }

        const permissions = user.permissions.get(channelID) || [];
        if (permissions.includes(permission)) {
            return next();
        } else {
            res.status(403).json({'Forbidden': 'You do not have permission to access this resource'});
            return;
        }
    };
}

export default checkPermission;
import { Router } from "express";
import { checkTeamPermission, checkDirectMessagePermission } from "../middlewares/permissionMiddleware";
import authenticate from "../middlewares/authMiddleware";
import DirectMessageController from "../controllers/directMessageController";
import { TeamRole } from "../enums";

const directMessageRoutes = Router();

directMessageRoutes.post('/createDirectMessage', authenticate, checkTeamPermission(TeamRole.MEMBER), DirectMessageController.createDirectMessage);
directMessageRoutes.post('/getDirectMessages', authenticate, checkTeamPermission(TeamRole.MEMBER), checkDirectMessagePermission(), DirectMessageController.getDirectMessages);
directMessageRoutes.post('/sendDirectMessage', authenticate, checkTeamPermission(TeamRole.MEMBER), checkDirectMessagePermission(), DirectMessageController.sendDirectMessage);

export default directMessageRoutes;
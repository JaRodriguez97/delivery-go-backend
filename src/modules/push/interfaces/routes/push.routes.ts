import { Router } from "express";
import { PushController } from "../controllers/push.controller";
import { authenticationMiddleware } from "../../../../shared/middlewares/authentication.middleware";

const router = Router();

router.post("/register", authenticationMiddleware, PushController.registerDevice);
router.get("/notifications", authenticationMiddleware, PushController.getNotifications);

export const pushRoutes = router;

import { Router } from "express";
import { SettingsController } from "../controllers/settings.controller";
import { authenticationMiddleware } from "../../../../shared/middlewares/authentication.middleware";
import { validate } from "../../../../shared/middlewares/validation.middleware";
import {
  updateGeneralSettingsSchema,
  updateNotificationSettingsSchema,
} from "../../application/dtos/settings.dto";

const router = Router();

router.use(authenticationMiddleware);

router.get("/general", SettingsController.getGeneral);
router.put(
  "/general",
  validate(updateGeneralSettingsSchema),
  SettingsController.updateGeneral,
);
router.get("/integrations", SettingsController.getIntegrations);
router.get("/notifications", SettingsController.getNotifications);
router.put(
  "/notifications",
  validate(updateNotificationSettingsSchema),
  SettingsController.updateNotifications,
);

export const settingsRoutes = router;

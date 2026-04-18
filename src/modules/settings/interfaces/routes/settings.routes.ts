import { Router } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { SettingsController } from "../controllers/settings.controller";
import { authenticationMiddleware } from "../../../../shared/middlewares/authentication.middleware";
import { validate } from "../../../../shared/middlewares/validation.middleware";
import {
  createAdminSchema,
  changeOwnPasswordSchema,
  resetAdminPasswordSchema,
  updateGeneralSettingsSchema,
  updateFinancialSettingsSchema,
  updateNotificationSettingsSchema,
} from "../../application/dtos/settings.dto";

const router = Router();

const logoUploadDirectory = path.join(
  process.cwd(),
  "uploads",
  "system-branding",
);

if (!fs.existsSync(logoUploadDirectory)) {
  fs.mkdirSync(logoUploadDirectory, { recursive: true });
}

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, logoUploadDirectory),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname) || ".png";
    cb(
      null,
      `system-logo-${Date.now()}-${Math.round(Math.random() * 1e6)}${extension}`,
    );
  },
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Solo se permiten imágenes"));
      return;
    }

    cb(null, true);
  },
});

router.get("/public-branding", SettingsController.getPublicBranding);

router.use(authenticationMiddleware);

router.get("/general", SettingsController.getGeneral);
router.put(
  "/general",
  validate(updateGeneralSettingsSchema),
  SettingsController.updateGeneral,
);

router.get("/financial", SettingsController.getFinancial);
router.put(
  "/financial",
  validate(updateFinancialSettingsSchema),
  SettingsController.updateFinancial,
);

router.post(
  "/branding/logo",
  logoUpload.single("logo"),
  SettingsController.uploadLogo,
);

router.get("/integrations", SettingsController.getIntegrations);

router.get("/notifications", SettingsController.getNotifications);
router.put(
  "/notifications",
  validate(updateNotificationSettingsSchema),
  SettingsController.updateNotifications,
);

router.get("/security/admins", SettingsController.getAdmins);
router.post(
  "/security/admins",
  validate(createAdminSchema),
  SettingsController.createAdmin,
);

router.put(
  "/security/password",
  validate(changeOwnPasswordSchema),
  SettingsController.changeOwnPassword,
);

router.put(
  "/security/admins/:adminId/password",
  validate(resetAdminPasswordSchema),
  SettingsController.resetAdminPassword,
);

export const settingsRoutes = router;

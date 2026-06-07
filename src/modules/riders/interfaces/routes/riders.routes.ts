import { Router } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { RidersController } from "../controllers/riders.controller";
import { authenticationMiddleware } from "../../../../shared/middlewares/authentication.middleware";
import { authorizationMiddleware } from "../../../../shared/middlewares/authorization.middleware";
import { validate } from "../../../../shared/middlewares/validation.middleware";
import {
  createRiderSchema,
  registerRiderSchema,
  reviewRiderSchema,
  updateRiderSchema,
} from "../../application/dtos/riders.dto";
import { ROLES } from "../../../../shared/security/roles";

const router = Router();

const riderUploadDirectory = path.join(process.cwd(), "uploads", "riders");

if (!fs.existsSync(riderUploadDirectory)) {
  fs.mkdirSync(riderUploadDirectory, { recursive: true });
}

const riderStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, riderUploadDirectory),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname) || ".jpg";
    cb(
      null,
      `rider-${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e6)}${extension}`,
    );
  },
});

const riderUpload = multer({
  storage: riderStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
});

router.post(
  "/register",
  riderUpload.any(),
  validate(registerRiderSchema),
  RidersController.register,
);

router.use(authenticationMiddleware);

router.get("/", RidersController.list);
router.get("/:id", RidersController.getById);
router.post("/", validate(createRiderSchema), RidersController.create);
router.patch(
  "/:id/review",
  authorizationMiddleware(ROLES.ADMIN),
  validate(reviewRiderSchema),
  RidersController.review,
);
router.put("/:id", validate(updateRiderSchema), RidersController.update);
router.delete("/:id", RidersController.remove);

export const ridersRoutes = router;

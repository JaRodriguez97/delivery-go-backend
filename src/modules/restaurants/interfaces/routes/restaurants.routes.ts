import { Router } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { RestaurantsController } from "../controllers/restaurants.controller";
import { authenticationMiddleware } from "../../../../shared/middlewares/authentication.middleware";
import { authorizationMiddleware } from "../../../../shared/middlewares/authorization.middleware";
import { validate } from "../../../../shared/middlewares/validation.middleware";
import {
  createRestaurantSchema,
  registerRestaurantSchema,
  reviewRestaurantSchema,
  updateRestaurantSchema,
} from "../../application/dtos/restaurants.dto";
import { ROLES } from "../../../../shared/security/roles";

const router = Router();

const restaurantUploadDirectory = path.join(
  process.cwd(),
  "uploads",
  "restaurants",
);

if (!fs.existsSync(restaurantUploadDirectory)) {
  fs.mkdirSync(restaurantUploadDirectory, { recursive: true });
}

const restaurantStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, restaurantUploadDirectory),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname) || ".jpg";
    cb(null, `restaurant-${file.fieldname}-${Date.now()}${extension}`);
  },
});

const restaurantUpload = multer({
  storage: restaurantStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
});

router.post(
  "/register",
  restaurantUpload.any(),
  validate(registerRestaurantSchema),
  RestaurantsController.register,
);

router.use(authenticationMiddleware);

router.get("/", RestaurantsController.list);
router.get("/:id", RestaurantsController.getById);
router.post(
  "/",
  validate(createRestaurantSchema),
  RestaurantsController.create,
);
router.put(
  "/:id",
  validate(updateRestaurantSchema),
  RestaurantsController.update,
);
router.patch(
  "/:id/review",
  authorizationMiddleware(ROLES.ADMIN),
  validate(reviewRestaurantSchema),
  RestaurantsController.review,
);
router.patch(
  "/:id/toggle-status",
  authorizationMiddleware(ROLES.ADMIN),
  RestaurantsController.toggleStatus,
);
router.delete("/:id", RestaurantsController.remove);

export const restaurantsRoutes = router;

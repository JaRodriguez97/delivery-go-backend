import { Router } from "express";
import { RestaurantsController } from "../controllers/restaurants.controller";
import { authenticationMiddleware } from "../../../../shared/middlewares/authentication.middleware";
import { validate } from "../../../../shared/middlewares/validation.middleware";
import {
  createRestaurantSchema,
  updateRestaurantSchema,
} from "../../application/dtos/restaurants.dto";

const router = Router();

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
router.delete("/:id", RestaurantsController.remove);

export const restaurantsRoutes = router;

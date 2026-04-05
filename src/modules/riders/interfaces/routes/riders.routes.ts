import { Router } from "express";
import { RidersController } from "../controllers/riders.controller";
import { authenticationMiddleware } from "../../../../shared/middlewares/authentication.middleware";
import { validate } from "../../../../shared/middlewares/validation.middleware";
import {
  createRiderSchema,
  updateRiderSchema,
} from "../../application/dtos/riders.dto";

const router = Router();

router.use(authenticationMiddleware);

router.get("/", RidersController.list);
router.get("/:id", RidersController.getById);
router.post("/", validate(createRiderSchema), RidersController.create);
router.put("/:id", validate(updateRiderSchema), RidersController.update);
router.delete("/:id", RidersController.remove);

export const ridersRoutes = router;

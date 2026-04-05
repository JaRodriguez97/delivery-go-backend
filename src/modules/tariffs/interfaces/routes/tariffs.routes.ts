import { Router } from "express";
import { TariffsController } from "../controllers/tariffs.controller";
import { authenticationMiddleware } from "../../../../shared/middlewares/authentication.middleware";
import { validate } from "../../../../shared/middlewares/validation.middleware";
import {
  createTariffSchema,
  updateTariffSchema,
} from "../../application/dtos/tariffs.dto";

const router = Router();

router.use(authenticationMiddleware);

router.get("/calculate", TariffsController.calculate);
router.get("/", TariffsController.list);
router.get("/:id", TariffsController.getById);
router.post("/", validate(createTariffSchema), TariffsController.create);
router.put("/:id", validate(updateTariffSchema), TariffsController.update);
router.delete("/:id", TariffsController.remove);

export const tariffsRoutes = router;

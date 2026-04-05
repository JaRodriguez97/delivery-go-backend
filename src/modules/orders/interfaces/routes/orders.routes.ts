import { Router } from "express";
import { OrdersController } from "../controllers/orders.controller";
import { authenticationMiddleware } from "../../../../shared/middlewares/authentication.middleware";
import { validate } from "../../../../shared/middlewares/validation.middleware";
import {
  createOrderSchema,
  updateOrderSchema,
} from "../../application/dtos/orders.dto";

const router = Router();

router.use(authenticationMiddleware);

router.get("/", OrdersController.list);
router.get("/:id", OrdersController.getById);
router.post("/", validate(createOrderSchema), OrdersController.create);
router.put("/:id", validate(updateOrderSchema), OrdersController.update);
router.delete("/:id", OrdersController.remove);

export const ordersRoutes = router;

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

router.get("/available", OrdersController.available);
router.get("/", OrdersController.list);
router.post("/", validate(createOrderSchema), OrdersController.create);
router.patch("/:id/start-preparing", OrdersController.startPreparing);
router.patch("/:id/assignment/accept", OrdersController.acceptAssignment);
router.patch("/:id/assignment/reject", OrdersController.rejectAssignment);
router.patch("/:id/delivery-status", OrdersController.updateDeliveryStatus);
router.get("/:id", OrdersController.getById);
router.put("/:id", validate(updateOrderSchema), OrdersController.update);
router.delete("/:id", OrdersController.remove);

export const ordersRoutes = router;

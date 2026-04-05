import { Router } from "express";
import { PaymentsController } from "../controllers/payments.controller";
import { authenticationMiddleware } from "../../../../shared/middlewares/authentication.middleware";
import { validate } from "../../../../shared/middlewares/validation.middleware";
import {
  processPaymentSchema,
  refundPaymentSchema,
} from "../../application/dtos/payments.dto";

const router = Router();

router.use(authenticationMiddleware);

router.get("/invoices", PaymentsController.invoices);
router.get("/", PaymentsController.list);
router.get("/:id", PaymentsController.getById);
router.post(
  "/process",
  validate(processPaymentSchema),
  PaymentsController.process,
);
router.post(
  "/:id/refund",
  validate(refundPaymentSchema),
  PaymentsController.refund,
);

export const paymentsRoutes = router;

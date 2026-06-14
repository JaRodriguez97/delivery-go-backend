import { Router } from "express";
import { TrackingController } from "../controllers/tracking.controller";
import { authenticationMiddleware } from "../../../../shared/middlewares/authentication.middleware";
import { validate } from "../../../../shared/middlewares/validation.middleware";
import { updateMyLocationSchema } from "../../application/dtos/tracking.dto";

const router = Router();

router.use(authenticationMiddleware);

router.get("/snapshot", TrackingController.snapshot);
router.patch(
  "/my-location",
  validate(updateMyLocationSchema),
  TrackingController.updateMyLocation,
);
router.get("/order/:id", TrackingController.trackOrder);
router.get("/rider/:id", TrackingController.trackRider);
router.get("/route/:id", TrackingController.getDeliveryRoute);

export const trackingRoutes = router;

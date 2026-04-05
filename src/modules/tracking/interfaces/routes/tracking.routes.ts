import { Router } from "express";
import { TrackingController } from "../controllers/tracking.controller";
import { authenticationMiddleware } from "../../../../shared/middlewares/authentication.middleware";

const router = Router();

router.use(authenticationMiddleware);

router.get("/order/:id", TrackingController.trackOrder);
router.get("/rider/:id", TrackingController.trackRider);
router.get("/route/:id", TrackingController.getDeliveryRoute);

export const trackingRoutes = router;

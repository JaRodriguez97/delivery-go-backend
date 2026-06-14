import { Router } from "express";
import { authenticationMiddleware } from "../../../../shared/middlewares/authentication.middleware";
import { GeocodeController } from "../controllers/geocode.controller";

const router = Router();

router.use(authenticationMiddleware);

router.get("/", GeocodeController.search);
router.get("/reverse", GeocodeController.reverse);

export const geocodeRoutes = router;

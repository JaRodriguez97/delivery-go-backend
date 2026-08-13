import { Router } from "express";
import { GeocodeController } from "../controllers/geocode.controller";

const router = Router();

router.get("/", GeocodeController.search);
router.get("/reverse", GeocodeController.reverse);

export const geocodeRoutes = router;

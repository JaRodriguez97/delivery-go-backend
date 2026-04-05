import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller";
import { authenticationMiddleware } from "../../../../shared/middlewares/authentication.middleware";

const router = Router();

router.use(authenticationMiddleware);

router.get("/metrics", DashboardController.metrics);
router.get("/recent-orders", DashboardController.recentOrders);

export const dashboardRoutes = router;

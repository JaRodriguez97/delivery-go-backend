import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller";
import { authenticationMiddleware } from "../../../../shared/middlewares/authentication.middleware";
import { authorizationMiddleware } from "../../../../shared/middlewares/authorization.middleware";
import { ROLES } from "../../../../shared/security/roles";

const router = Router();

router.use(authenticationMiddleware, authorizationMiddleware(ROLES.ADMIN));

router.get("/metrics", DashboardController.metrics);
router.get("/recent-orders", DashboardController.recentOrders);

export const dashboardRoutes = router;

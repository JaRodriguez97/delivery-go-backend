import { Router } from "express";
import { ReportsController } from "../controllers/reports.controller";
import { authenticationMiddleware } from "../../../../shared/middlewares/authentication.middleware";

const router = Router();

router.use(authenticationMiddleware);

router.get("/summary/filters", ReportsController.summaryFilters);
router.get("/summary", ReportsController.summary);
router.get("/sales", ReportsController.sales);
router.get("/performance", ReportsController.performance);
router.get("/financial", ReportsController.financial);
router.get("/:type/export", ReportsController.exportReport);

export const reportsRoutes = router;

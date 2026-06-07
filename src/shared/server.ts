import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import { errorHandler } from "./middlewares/error.middleware";
import { prisma } from "./config/database";
import { authRoutes } from "../modules/auth/interfaces/routes/auth.routes";
import { dashboardRoutes } from "../modules/dashboard/interfaces/routes/dashboard.routes";
import { ordersRoutes } from "../modules/orders/interfaces/routes/orders.routes";
import { restaurantsRoutes } from "../modules/restaurants/interfaces/routes/restaurants.routes";
import { ridersRoutes } from "../modules/riders/interfaces/routes/riders.routes";
import { trackingRoutes } from "../modules/tracking/interfaces/routes/tracking.routes";
import { tariffsRoutes } from "../modules/tariffs/interfaces/routes/tariffs.routes";
import { paymentsRoutes } from "../modules/payments/interfaces/routes/payments.routes";
import { reportsRoutes } from "../modules/reports/interfaces/routes/reports.routes";
import { supportRoutes } from "../modules/support/interfaces/routes/support.routes";
import { settingsRoutes } from "../modules/settings/interfaces/routes/settings.routes";

async function connectDB(retries = 5) {
  while (retries) {
    try {
      await prisma.$connect();
      console.log("DB conectada");
      return;
    } catch (err) {
      retries--;
      console.log("Retry DB...", retries);
      await prisma.$disconnect();
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  throw new Error("DB no conecta");
}

connectDB();

export function createServer() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan("dev"));
  app.use(
    "/uploads",
    (_req, res, next) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      next();
    },
    express.static(path.join(process.cwd(), "uploads")),
  );

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: { error: "Demasiadas peticiones, intenta más tarde" },
    }),
  );

  app.get("/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", db: "connected" });
    } catch {
      res.status(500).json({ status: "error", db: "disconnected" });
    }
  });

  // ─── API Routes ───
  app.use("/api/auth", authRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/restaurants", restaurantsRoutes);
  app.use("/api/riders", ridersRoutes);
  app.use("/api/tracking", trackingRoutes);
  app.use("/api/tariffs", tariffsRoutes);
  app.use("/api/payments", paymentsRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/support", supportRoutes);
  app.use("/api/settings", settingsRoutes);

  app.use(errorHandler);

  return app;
}

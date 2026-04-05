import { Request, Response } from "express";
import { PrismaDashboardRepository } from "../../infrastructure/repositories/prisma-dashboard.repository";
import { GetMetricsUseCase } from "../../application/use-cases/get-metrics.use-case";
import { GetRecentOrdersUseCase } from "../../application/use-cases/get-recent-orders.use-case";

const repo = new PrismaDashboardRepository();
const getMetrics = new GetMetricsUseCase(repo);
const getRecentOrders = new GetRecentOrdersUseCase(repo);

export class DashboardController {
  static async metrics(_req: Request, res: Response) {
    try {
      const data = await getMetrics.execute();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener métricas" });
    }
  }

  static async recentOrders(req: Request, res: Response) {
    try {
      const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
      const data = await getRecentOrders.execute(limit);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener pedidos recientes" });
    }
  }
}

import { Request, Response } from "express";
import { PrismaTrackingRepository } from "../../infrastructure/repositories/prisma-tracking.repository";

const repo = new PrismaTrackingRepository();

export class TrackingController {
  static async trackOrder(req: Request, res: Response) {
    try {
      const result = await repo.getOrderTracking(req.params.id as string);
      if (!result) {
        res.status(404).json({ error: "Pedido no encontrado" });
        return;
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener tracking del pedido" });
    }
  }

  static async trackRider(req: Request, res: Response) {
    try {
      const result = await repo.getRiderTracking(req.params.id as string);
      if (!result) {
        res.status(404).json({ error: "Repartidor no encontrado" });
        return;
      }
      res.json(result);
    } catch (error) {
      res
        .status(500)
        .json({ error: "Error al obtener tracking del repartidor" });
    }
  }

  static async getDeliveryRoute(req: Request, res: Response) {
    try {
      const route = await repo.getDeliveryRoute(req.params.id as string);
      res.json(route);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener ruta de entrega" });
    }
  }
}

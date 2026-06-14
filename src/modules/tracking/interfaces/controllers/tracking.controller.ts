import { Request, Response } from "express";
import { PrismaTrackingRepository } from "../../infrastructure/repositories/prisma-tracking.repository";
import { ActiveDeliveryFilter } from "../../domain/repositories/tracking.repository";
import { AuthenticatedRequest } from "../../../../shared/types/authenticated-request";

const repo = new PrismaTrackingRepository();

export class TrackingController {
  static async snapshot(req: Request, res: Response) {
    try {
      const rawFilter = (req.query.filter as string | undefined)?.toUpperCase();
      const allowedFilters: ActiveDeliveryFilter[] = [
        "ALL",
        "ONLINE",
        "OFFLINE",
        "IN_DELIVERY",
      ];

      const filter = allowedFilters.includes(rawFilter as ActiveDeliveryFilter)
        ? (rawFilter as ActiveDeliveryFilter)
        : "ALL";

      const rawDeliveriesLimit = Number(
        req.query.deliveriesLimit ?? req.query.limit,
      );
      const rawRidersLimit = Number(req.query.ridersLimit ?? 300);

      const payload = await repo.getSnapshot({
        search: req.query.search as string | undefined,
        filter,
        deliveriesLimit: Number.isFinite(rawDeliveriesLimit)
          ? rawDeliveriesLimit
          : 50,
        ridersLimit: Number.isFinite(rawRidersLimit) ? rawRidersLimit : 300,
      });

      res.json(payload);
    } catch {
      res.status(500).json({ error: "Error al obtener snapshot de tracking" });
    }
  }

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

  static async updateMyLocation(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: "Usuario no autenticado" });
        return;
      }

      const result = await repo.updateCourierLocationByUserId({
        userId: req.user.userId,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        speed: req.body.speed,
        heading: req.body.heading,
        recordedAt: req.body.recordedAt,
      });

      res.json({
        message: "Ubicacion actualizada",
        deliveryId: result.deliveryId,
      });
    } catch (error: any) {
      const message = error?.message ?? "Error al actualizar ubicacion";
      const status = message === "Repartidor no encontrado" ? 409 : 500;

      res.status(status).json({ error: message });
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

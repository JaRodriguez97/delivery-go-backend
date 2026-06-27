import { Request, Response } from "express";
import { hashPassword } from "../../../../shared/security/hash.service";
import { PrismaRestaurantsRepository } from "../../infrastructure/repositories/prisma-restaurants.repository";
import { parsePagination } from "../../../../shared/utils/pagination";
import { AuthenticatedRequest } from "../../../../shared/types/authenticated-request";

const repo = new PrismaRestaurantsRepository();

export class RestaurantsController {
  static async register(req: Request, res: Response) {
    try {
      const files = Array.isArray(req.files)
        ? (req.files as Express.Multer.File[])
        : [];
      const businessLicense =
        files.find((file) => file.fieldname === "businessLicenseFile") ??
        files.find((file) =>
          ["licenseFile", "businessLicense", "file"].includes(file.fieldname),
        ) ??
        files[0];

      const payload = { ...req.body };
      if (payload.latitude) {
        payload.latitude = parseFloat(payload.latitude);
      }
      if (payload.longitude) {
        payload.longitude = parseFloat(payload.longitude);
      }

      const passwordHash = await hashPassword(req.body.password as string);
      const result = await repo.registerRestaurant({
        ...payload,
        passwordHash,
        businessLicenseUrl: businessLicense
          ? `/uploads/restaurants/${businessLicense.filename}`
          : undefined,
      });

      res.status(201).json({
        message: "Registro enviado para revision manual",
        restaurantId: result.id,
      });
    } catch (error: any) {
      res.status(500).json({
        error: error?.message || "Error al registrar restaurante",
      });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const pagination = parsePagination(req);
      const filters = {
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined,
        dateFrom: req.query.dateFrom
          ? new Date(req.query.dateFrom as string)
          : undefined,
        dateTo: req.query.dateTo
          ? new Date(req.query.dateTo as string)
          : undefined,
      };
      const [kpis, result] = await Promise.all([
        repo.getKpis(),
        repo.getRestaurants(filters, pagination),
      ]);
      res.json({ kpis, ...result });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener restaurantes" });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const restaurant = await repo.getRestaurantById(req.params.id as string);
      if (!restaurant) {
        res.status(404).json({ error: "Restaurante no encontrado" });
        return;
      }
      res.json(restaurant);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener restaurante" });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const result = await repo.createRestaurant(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: "Error al crear restaurante" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      await repo.updateRestaurant(req.params.id as string, req.body);
      res.json({ message: "Restaurante actualizado" });
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar restaurante" });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      await repo.deleteRestaurant(req.params.id as string);
      res.json({ message: "Restaurante desactivado" });
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar restaurante" });
    }
  }

  static async review(req: Request, res: Response) {
    try {
      await repo.reviewRestaurant(req.params.id as string, req.body);
      res.json({ message: "Revision de restaurante aplicada" });
    } catch (error: any) {
      res.status(500).json({
        error: error?.message || "Error al revisar restaurante",
      });
    }
  }

  static async toggleStatus(req: Request, res: Response) {
    try {
      await repo.toggleRestaurantStatus(req.params.id as string);
      res.json({ message: "Estado del restaurante actualizado" });
    } catch (error: any) {
      res.status(500).json({
        error: error?.message || "Error al alternar estado del restaurante",
      });
    }
  }

  static async updateLocation(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const latitude = parseFloat(req.body.latitude);
      const longitude = parseFloat(req.body.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        res.status(400).json({ error: "latitude y longitude deben ser números válidos" });
        return;
      }

      await repo.updateRestaurant(id, { latitude, longitude });
      res.json({ message: "Ubicación del restaurante actualizada" });
    } catch (error: any) {
      res.status(500).json({
        error: error?.message || "Error al actualizar ubicación del restaurante",
      });
    }
  }

  static async getMyRestaurant(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const restaurant = await repo.getRestaurantByUserId(userId);
      if (!restaurant) {
        res.status(404).json({ error: "Restaurante no encontrado para el usuario actual" });
        return;
      }

      res.json(restaurant);
    } catch (error: any) {
      res.status(500).json({
        error: error?.message || "Error al obtener restaurante del usuario actual",
      });
    }
  }
}

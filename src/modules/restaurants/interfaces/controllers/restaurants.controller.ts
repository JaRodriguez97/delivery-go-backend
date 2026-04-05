import { Request, Response } from "express";
import { PrismaRestaurantsRepository } from "../../infrastructure/repositories/prisma-restaurants.repository";
import { parsePagination } from "../../../../shared/utils/pagination";

const repo = new PrismaRestaurantsRepository();

export class RestaurantsController {
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
}

import { Request, Response } from "express";
import { PrismaTariffsRepository } from "../../infrastructure/repositories/prisma-tariffs.repository";

const repo = new PrismaTariffsRepository();

export class TariffsController {
  static async list(_req: Request, res: Response) {
    try {
      const tariffs = await repo.getTariffs();
      res.json({ data: tariffs });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener tarifas" });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const tariff = await repo.getTariffById(req.params.id as string);
      if (!tariff) {
        res.status(404).json({ error: "Tarifa no encontrada" });
        return;
      }
      res.json(tariff);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener tarifa" });
    }
  }

  static async history(req: Request, res: Response) {
    try {
      const rawLimit = Number(req.query.limit);
      const limit = Number.isFinite(rawLimit) ? rawLimit : 20;
      const history = await repo.getTariffChangeHistory(limit);
      res.json({ data: history });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener historial de tarifas" });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const result = await repo.createTariff(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: "Error al crear tarifa" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      await repo.updateTariff(req.params.id as string, req.body);
      res.json({ message: "Tarifa actualizada" });
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar tarifa" });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      await repo.deleteTariff(req.params.id as string);
      res.json({ message: "Tarifa desactivada" });
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar tarifa" });
    }
  }

  static async calculate(req: Request, res: Response) {
    try {
      const distance = Number(req.query.distance);
      if (!Number.isFinite(distance) || distance < 0) {
        res.status(400).json({ error: "Distancia inválida" });
        return;
      }

      const result = await repo.calculateFee(distance);
      if (!result) {
        res.status(404).json({ error: "No hay tarifa activa configurada" });
        return;
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Error al calcular tarifa" });
    }
  }
}

import { Request, Response } from "express";
import { PrismaSupportRepository } from "../../infrastructure/repositories/prisma-support.repository";
import { parsePagination } from "../../../../shared/utils/pagination";
import { AuthenticatedRequest } from "../../../../shared/types/authenticated-request";

const repo = new PrismaSupportRepository();

export class SupportController {
  static async list(req: Request, res: Response) {
    try {
      const pagination = parsePagination(req);
      const filters = {
        search: req.query.search as string | undefined,
        status: req.query.status as string | undefined,
      };
      const [kpis, result] = await Promise.all([
        repo.getKpis(),
        repo.getTickets(filters, pagination),
      ]);
      res.json({ kpis, ...result });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener tickets" });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const ticket = await repo.getTicketById(req.params.id as string);
      if (!ticket) {
        res.status(404).json({ error: "Ticket no encontrado" });
        return;
      }
      res.json(ticket);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener ticket" });
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const result = await repo.createTicket(req.body, userId);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: "Error al crear ticket" });
    }
  }

  static async close(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      await repo.closeTicket(
        req.params.id as string,
        req.body.resolution,
        userId,
      );
      res.json({ message: "Ticket cerrado" });
    } catch (error) {
      res.status(500).json({ error: "Error al cerrar ticket" });
    }
  }

  static async addComment(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const result = await repo.addComment(
        req.params.id as string,
        req.body.comment,
        userId,
      );
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: "Error al agregar comentario" });
    }
  }
}

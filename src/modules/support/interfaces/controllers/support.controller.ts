import { Request, Response } from "express";
import { PrismaSupportRepository } from "../../infrastructure/repositories/prisma-support.repository";
import { parsePagination } from "../../../../shared/utils/pagination";
import { AuthenticatedRequest } from "../../../../shared/types/authenticated-request";

const repo = new PrismaSupportRepository();

function parseOptionalDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export class SupportController {
  static async list(req: Request, res: Response) {
    try {
      const pagination = parsePagination(req);
      const filters = {
        search: req.query.search as string | undefined,
        status: req.query.status as string | undefined,
        type: req.query.type as string | undefined,
        createdDate: parseOptionalDate(req.query.createdDate),
      };
      const dashboard = await repo.getDashboard(filters, pagination);
      res.json(dashboard);
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

  static async updateStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      await repo.updateStatus(
        req.params.id as string,
        req.body.status,
        userId,
      );
      res.json({ message: "Estado de ticket actualizado" });
    } catch (error) {
      console.error("❌ Error al actualizar estado del ticket:", error);
      res.status(500).json({ error: "Error al actualizar estado del ticket" });
    }
  }
}

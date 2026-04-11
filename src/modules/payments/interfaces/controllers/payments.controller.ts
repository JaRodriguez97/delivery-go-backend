import { Request, Response } from "express";
import { PrismaPaymentsRepository } from "../../infrastructure/repositories/prisma-payments.repository";
import { parsePagination } from "../../../../shared/utils/pagination";
import { AuthenticatedRequest } from "../../../../shared/types/authenticated-request";

const repo = new PrismaPaymentsRepository();

export class PaymentsController {
  static async dashboard(req: Request, res: Response) {
    try {
      const pagination = parsePagination(req);
      const filters = {
        search: req.query.search as string | undefined,
        status: req.query.status as string | undefined,
        paymentMethodId: req.query.paymentMethodId as string | undefined,
      };

      const result = await repo.getDashboard(filters, pagination);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener dashboard de pagos" });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const pagination = parsePagination(req);
      const filters = {
        search: req.query.search as string | undefined,
        status: req.query.status as string | undefined,
        paymentMethodId: req.query.paymentMethodId as string | undefined,
      };
      const [kpis, result] = await Promise.all([
        repo.getKpis(),
        repo.getPayments(filters, pagination),
      ]);
      res.json({ kpis, ...result });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener pagos" });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const payment = await repo.getPaymentById(req.params.id as string);
      if (!payment) {
        res.status(404).json({ error: "Pago no encontrado" });
        return;
      }
      res.json(payment);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener pago" });
    }
  }

  static async methods(_req: Request, res: Response) {
    try {
      const methods = await repo.getPaymentMethods();
      res.json({ data: methods });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener métodos de pago" });
    }
  }

  static async process(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await repo.processPayment({
        ...req.body,
        createdBy: req.user?.userId,
      });
      res.status(201).json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al procesar pago";
      const statusCode =
        message.includes("no encontrado") ||
        message.includes("inválido") ||
        message.includes("excede") ||
        message.includes("permite")
          ? 400
          : 500;

      res.status(statusCode).json({ error: message });
    }
  }

  static async complete(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await repo.completePayment(
        req.params.id as string,
        req.user?.userId,
      );
      res.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al completar pago";
      const statusCode =
        message.includes("no encontrado") ||
        message.includes("solo se puede") ||
        message.includes("pendiente")
          ? 400
          : 500;

      res.status(statusCode).json({ error: message });
    }
  }

  static async refund(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const result = await repo.refundPayment(
        req.params.id as string,
        req.body,
        userId,
      );
      res.status(201).json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al procesar reembolso";
      const statusCode =
        message.includes("no encontrado") ||
        message.includes("excede") ||
        message.includes("Solo") ||
        message.includes("solo")
          ? 400
          : 500;

      res.status(statusCode).json({ error: message });
    }
  }

  static async invoices(req: Request, res: Response) {
    try {
      const pagination = parsePagination(req);
      const result = await repo.getInvoices(pagination);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener facturas" });
    }
  }
}

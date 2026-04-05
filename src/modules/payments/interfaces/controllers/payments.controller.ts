import { Request, Response } from "express";
import { PrismaPaymentsRepository } from "../../infrastructure/repositories/prisma-payments.repository";
import { parsePagination } from "../../../../shared/utils/pagination";

const repo = new PrismaPaymentsRepository();

export class PaymentsController {
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

  static async process(req: Request, res: Response) {
    try {
      const result = await repo.processPayment(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: "Error al procesar pago" });
    }
  }

  static async refund(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const result = await repo.refundPayment(
        req.params.id as string,
        req.body,
        userId,
      );
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: "Error al procesar reembolso" });
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

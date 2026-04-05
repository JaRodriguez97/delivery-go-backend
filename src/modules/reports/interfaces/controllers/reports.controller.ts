import { Request, Response } from "express";
import { PrismaReportsRepository } from "../../infrastructure/repositories/prisma-reports.repository";

const repo = new PrismaReportsRepository();

function parseDateRange(req: Request): { startDate: Date; endDate: Date } {
  const startDate = req.query.startDate
    ? new Date(req.query.startDate as string)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = req.query.endDate
    ? new Date(req.query.endDate as string)
    : new Date();
  return { startDate, endDate };
}

export class ReportsController {
  static async sales(req: Request, res: Response) {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const report = await repo.getSalesReport(startDate, endDate);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Error al generar reporte de ventas" });
    }
  }

  static async performance(req: Request, res: Response) {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const report = await repo.getPerformanceReport(startDate, endDate);
      res.json(report);
    } catch (error) {
      res
        .status(500)
        .json({ error: "Error al generar reporte de rendimiento" });
    }
  }

  static async financial(req: Request, res: Response) {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const report = await repo.getFinancialReport(startDate, endDate);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Error al generar reporte financiero" });
    }
  }

  static async exportReport(req: Request, res: Response) {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const type = req.params.type;
      const format = (req.query.format as string) || "csv";

      let data: any;
      switch (type) {
        case "sales":
          data = await repo.getSalesReport(startDate, endDate);
          break;
        case "performance":
          data = await repo.getPerformanceReport(startDate, endDate);
          break;
        case "financial":
          data = await repo.getFinancialReport(startDate, endDate);
          break;
        default:
          res.status(400).json({ error: "Tipo de reporte no válido" });
          return;
      }

      // Placeholder: retorna JSON (export PDF/CSV a implementar)
      res.json({ format, type, data });
    } catch (error) {
      res.status(500).json({ error: "Error al exportar reporte" });
    }
  }
}

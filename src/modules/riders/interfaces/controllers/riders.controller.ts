import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { PrismaRidersRepository } from "../../infrastructure/repositories/prisma-riders.repository";
import { parsePagination } from "../../../../shared/utils/pagination";
import { validateRegisterRiderFiles } from "../../application/dtos/riders.dto";

const repo = new PrismaRidersRepository();

export class RidersController {
  static async register(req: Request, res: Response) {
    try {
      const requestFiles = req.files as
        | Express.Multer.File[]
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;

      const filesArray = Array.isArray(requestFiles)
        ? requestFiles
        : Object.values(requestFiles ?? {}).flat();

      const files = Object.fromEntries(
        filesArray.map((file) => [file.fieldname, file]),
      );

      const data = req.body;
      validateRegisterRiderFiles(files, data);
      const passwordHash = await bcrypt.hash(data.password, 10);

      const result = await repo.registerRider({
        ...data,
        passwordHash,
        files,
      });

      res.status(201).json({
        message: "Registro enviado para revision manual",
        riderId: result.id,
      });
    } catch (error: any) {
      console.log("🚀 ~ RidersController ~ register ~ error:", error);

      if (error?.code === "P1001" || error?.code === "P1002") {
        res.status(503).json({
          error:
            "No hay conexion con la base de datos en este momento. Intenta nuevamente en unos segundos.",
          code: error?.code,
        });
        return;
      }

      res.status(500).json({
        error: error?.message || "Error al registrar repartidor",
      });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const pagination = parsePagination(req);
      const filters = {
        search: req.query.search as string | undefined,
        phone: req.query.phone as string | undefined,
        status: req.query.status as string | undefined,
        isOnline:
          req.query.isOnline !== undefined
            ? req.query.isOnline === "true"
            : undefined,
        inOrder:
          req.query.inOrder !== undefined
            ? req.query.inOrder === "true"
            : undefined,
      };
      const [kpis, result] = await Promise.all([
        repo.getKpis(),
        repo.getRiders(filters, pagination),
      ]);
      res.json({ kpis, ...result });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener repartidores" });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const rider = await repo.getRiderById(req.params.id as string);
      if (!rider) {
        res.status(404).json({ error: "Repartidor no encontrado" });
        return;
      }
      res.json(rider);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener repartidor" });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const result = await repo.createRider(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: "Error al crear repartidor" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      await repo.updateRider(req.params.id as string, req.body);
      res.json({ message: "Repartidor actualizado" });
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar repartidor" });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      await repo.deleteRider(req.params.id as string);
      res.json({ message: "Repartidor desactivado" });
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar repartidor" });
    }
  }

  static async review(req: Request, res: Response) {
    try {
      await repo.reviewRider(req.params.id as string, req.body);
      res.json({ message: "Revision de repartidor aplicada" });
    } catch (error: any) {
      res.status(500).json({
        error: error?.message || "Error al revisar repartidor",
      });
    }
  }
}

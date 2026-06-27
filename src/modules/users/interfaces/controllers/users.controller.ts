import { Request, Response } from "express";
import { PrismaUsersRepository } from "../../infrastructure/repositories/prisma-users.repository";
import { parsePagination } from "../../../../shared/utils/pagination";
import { createUserSchema, updateUserSchema } from "../../application/dtos/users.dto";

const repo = new PrismaUsersRepository();

export class UsersController {
  static async list(req: Request, res: Response) {
    try {
      const pagination = parsePagination(req);
      const filters = {
        role: req.query.role as string | undefined,
        search: req.query.search as string | undefined,
      };

      const result = await repo.getUsers(filters, pagination);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Error al obtener usuarios" });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await repo.getUserById(id as string);
      if (!user) {
        res.status(404).json({ error: "Usuario no encontrado" });
        return;
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Error al obtener usuario" });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const payload = createUserSchema.parse(req.body);
      const user = await repo.createUser(payload);
      res.status(201).json(user);
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Datos de validación inválidos", details: error.errors });
        return;
      }
      res.status(500).json({ error: error?.message || "Error al crear usuario" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const payload = updateUserSchema.parse(req.body);
      const user = await repo.updateUser(id as string, payload);
      res.json(user);
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Datos de validación inválidos", details: error.errors });
        return;
      }
      res.status(500).json({ error: error?.message || "Error al actualizar usuario" });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const success = await repo.deleteUser(id as string);
      res.json({ success, message: "Usuario eliminado correctamente" });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Error al eliminar usuario" });
    }
  }
}

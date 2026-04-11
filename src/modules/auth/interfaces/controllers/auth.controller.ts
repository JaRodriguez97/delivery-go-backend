import { Request, Response } from "express";
import { PrismaAuthRepository } from "../../infrastructure/repositories/prisma-auth.repository";
import { AuthenticatedRequest } from "../../../../shared/types/authenticated-request";
import {
  LoginUseCase,
  AuthError,
} from "../../application/use-cases/login.use-case";
import { LogoutUseCase } from "../../application/use-cases/logout.use-case";
import { GetMeUseCase } from "../../application/use-cases/get-me.use-case";

const authRepo = new PrismaAuthRepository();
const loginUseCase = new LoginUseCase(authRepo);
const logoutUseCase = new LogoutUseCase(authRepo);
const getMeUseCase = new GetMeUseCase(authRepo);

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const result = await loginUseCase.execute(req.body, {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      res.json(result);
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        res.status(401).json({ error: "Token no proporcionado 1" });
        return;
      }

      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      await logoutUseCase.execute(token, {
        userId,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.json({ message: "Sesión cerrada exitosamente" });
    } catch (error) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  static async me(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const result = await getMeUseCase.execute(userId);
      res.json(result);
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
}

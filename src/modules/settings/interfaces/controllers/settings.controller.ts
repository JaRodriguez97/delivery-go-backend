import { Request, Response } from "express";
import {
  PrismaSettingsRepository,
  SettingsRepositoryError,
} from "../../infrastructure/repositories/prisma-settings.repository";
import { AuthenticatedRequest } from "../../../../shared/types/authenticated-request";

type RequestWithFile = Request & { file?: Express.Multer.File };

const repo = new PrismaSettingsRepository();

export class SettingsController {
  private static handleError(
    res: Response,
    error: unknown,
    fallbackMessage: string,
  ) {
    if (error instanceof SettingsRepositoryError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: fallbackMessage });
  }

  static async getPublicBranding(_req: Request, res: Response) {
    try {
      const branding = await repo.getPublicBranding();
      res.json(branding);
    } catch (error) {
      SettingsController.handleError(
        res,
        error,
        "Error al obtener branding público",
      );
    }
  }

  static async getGeneral(_req: Request, res: Response) {
    try {
      const settings = await repo.getGeneralSettings();
      res.json(settings);
    } catch (error) {
      SettingsController.handleError(
        res,
        error,
        "Error al obtener configuración general",
      );
    }
  }

  static async updateGeneral(req: Request, res: Response) {
    try {
      await repo.updateGeneralSettings(req.body);
      res.json({ message: "Configuración actualizada" });
    } catch (error) {
      SettingsController.handleError(
        res,
        error,
        "Error al actualizar configuración",
      );
    }
  }

  static async getFinancial(_req: Request, res: Response) {
    try {
      const settings = await repo.getFinancialSettings();
      res.json(settings);
    } catch (error) {
      SettingsController.handleError(
        res,
        error,
        "Error al obtener configuración financiera",
      );
    }
  }

  static async updateFinancial(req: Request, res: Response) {
    try {
      await repo.updateFinancialSettings(req.body);
      res.json({ message: "Configuración financiera actualizada" });
    } catch (error) {
      SettingsController.handleError(
        res,
        error,
        "Error al actualizar configuración financiera",
      );
    }
  }

  static async uploadLogo(req: RequestWithFile, res: Response) {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No se recibió ninguna imagen" });
        return;
      }

      const relativeLogoUrl = `/uploads/system-branding/${req.file.filename}`;
      const logoUrl = await repo.updateSystemLogo(relativeLogoUrl);

      res.json({ logoUrl, message: "Logo actualizado" });
    } catch (error) {
      SettingsController.handleError(res, error, "Error al actualizar logo");
    }
  }

  static async getIntegrations(_req: Request, res: Response) {
    try {
      const settings = await repo.getIntegrationSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener integraciones" });
    }
  }

  static async getNotifications(_req: Request, res: Response) {
    try {
      const settings = await repo.getNotificationSettings();
      res.json(settings);
    } catch (error) {
      SettingsController.handleError(
        res,
        error,
        "Error al obtener configuración de notificaciones",
      );
    }
  }

  static async updateNotifications(req: Request, res: Response) {
    try {
      await repo.updateNotificationSettings(req.body.channels);
      res.json({ message: "Configuración de notificaciones actualizada" });
    } catch (error) {
      SettingsController.handleError(
        res,
        error,
        "Error al actualizar notificaciones",
      );
    }
  }

  static async getAdmins(_req: Request, res: Response) {
    try {
      const admins = await repo.getAdminUsers();
      res.json({ admins });
    } catch (error) {
      SettingsController.handleError(
        res,
        error,
        "Error al obtener administradores",
      );
    }
  }

  static async createAdmin(req: Request, res: Response) {
    try {
      const admin = await repo.createAdmin(req.body);
      res.status(201).json({ admin, message: "Administrador creado" });
    } catch (error) {
      SettingsController.handleError(
        res,
        error,
        "Error al crear administrador",
      );
    }
  }

  static async changeOwnPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      await repo.changeOwnPassword(userId, req.body);
      res.json({ message: "Contraseña actualizada" });
    } catch (error) {
      SettingsController.handleError(res, error, "Error al cambiar contraseña");
    }
  }

  static async resetAdminPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const requesterRole = String(req.user?.role ?? "").toUpperCase();

      if (requesterRole !== "ADMIN") {
        res.status(403).json({ error: "No tienes permisos para esta acción" });
        return;
      }

      await repo.resetAdminPassword({
        adminId: String(req.params.adminId),
        newPassword: req.body.newPassword,
      });
      res.json({ message: "Contraseña del administrador actualizada" });
    } catch (error) {
      SettingsController.handleError(
        res,
        error,
        "Error al cambiar contraseña del administrador",
      );
    }
  }
}

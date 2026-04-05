import { Request, Response } from "express";
import { PrismaSettingsRepository } from "../../infrastructure/repositories/prisma-settings.repository";

const repo = new PrismaSettingsRepository();

export class SettingsController {
  static async getGeneral(_req: Request, res: Response) {
    try {
      const settings = await repo.getGeneralSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener configuración general" });
    }
  }

  static async updateGeneral(req: Request, res: Response) {
    try {
      await repo.updateGeneralSettings(req.body);
      res.json({ message: "Configuración actualizada" });
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar configuración" });
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
      res
        .status(500)
        .json({ error: "Error al obtener configuración de notificaciones" });
    }
  }

  static async updateNotifications(req: Request, res: Response) {
    try {
      await repo.updateNotificationSettings(req.body.channels);
      res.json({ message: "Configuración de notificaciones actualizada" });
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar notificaciones" });
    }
  }
}

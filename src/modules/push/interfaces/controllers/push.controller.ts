import { Response } from "express";
import { AuthenticatedRequest } from "../../../../shared/types/authenticated-request";
import { prisma } from "../../../../shared/config/database";

export class PushController {
  static async registerDevice(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "No autenticado" });
        return;
      }

      const { deviceToken, platform } = req.body;

      if (!deviceToken) {
        res.status(400).json({ error: "El token de dispositivo es requerido" });
        return;
      }

      // Upsert: registramos o actualizamos el dispositivo del usuario
      const pushDevice = await prisma.pushDevice.upsert({
        where: {
          deviceToken,
        },
        update: {
          userId,
          platform: platform || null,
          isActive: true,
          lastUsedAt: new Date(),
        },
        create: {
          userId,
          deviceToken,
          platform: platform || null,
          isActive: true,
          lastUsedAt: new Date(),
        },
      });

      console.log(`📲 Dispositivo push registrado para usuario ${userId}. Token: ${deviceToken.substring(0, 16)}...`);
      res.json({ message: "Dispositivo registrado exitosamente", deviceId: pushDevice.id });
    } catch (error) {
      console.error("❌ Error al registrar dispositivo push:", error);
      res.status(500).json({ error: "Error interno al registrar el dispositivo" });
    }
  }
}

import { prisma } from "../config/database";

export class PushNotificationService {
  /**
   * Envía una notificación push a un usuario específico, buscando todos sus dispositivos registrados activos.
   */
  static async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<boolean> {
    try {
      // Guardar en la base de datos
      try {
        const notif = await prisma.notification.create({
          data: {
            code: "PUSH",
            entityType: data?.entityType || null,
            entityId: data?.entityId || null,
            payload: { title, body, data },
            status: "SENT",
            createdAt: new Date(),
            processedAt: new Date(),
          },
        });

        await prisma.notificationRecipient.create({
          data: {
            notificationId: notif.id,
            userId,
            createdAt: new Date(),
          },
        });
      } catch (dbError) {
        console.error("❌ Error al guardar notificación en DB:", dbError);
      }

      // 1. Buscamos los dispositivos push activos asociados al usuario
      const devices = await prisma.pushDevice.findMany({
        where: {
          userId,
          isActive: true,
        },
      });

      if (devices.length === 0) {
        console.log(`🔕 [PUSH MOCK] El usuario ${userId} no tiene dispositivos push activos registrados.`);
        return false;
      }

      // 2. Enviamos la notificación a cada dispositivo registrado
      for (const device of devices) {
        await this.sendToToken(device.deviceToken, title, body, device.platform || "UNKNOWN", data);
      }

      return true;
    } catch (error) {
      console.error(`❌ Error al enviar notificaciones push al usuario ${userId}:`, error);
      return false;
    }
  }

  /**
   * Simula el envío a un token específico (APNs / FCM) e imprime los detalles en los logs del servidor.
   */
  static async sendToToken(
    token: string,
    title: string,
    body: string,
    platform: string,
    data?: Record<string, string>
  ): Promise<boolean> {
    console.log("🔔 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📲 [PUSH NOTIFICATION SENT]`);
    console.log(`   Plataforma: ${platform}`);
    console.log(`   Token:      ${token.substring(0, 24)}...`);
    console.log(`   Título:     ${title}`);
    console.log(`   Cuerpo:     ${body}`);
    if (data) {
      console.log(`   Data:       ${JSON.stringify(data, null, 2)}`);
    }
    console.log("🔔 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // NOTA DE PRODUCCIÓN:
    // Para conectar con Firebase Admin SDK real en producción:
    //
    // 1. Instalar firebase-admin: `npm install firebase-admin`
    // 2. Inicializar el SDK con la cuenta de servicio de Firebase (ej. en un archivo firebase.config.ts):
    //    admin.initializeApp({
    //      credential: admin.credential.cert(serviceAccountKey)
    //    });
    // 3. Reemplazar esta llamada con:
    //    try {
    //      const response = await admin.messaging().send({
    //        token: token,
    //        notification: { title, body },
    //        data: data,
    //        android: { priority: 'high' },
    //        apns: { payload: { aps: { sound: 'default' } } }
    //      });
    //      console.log('Firebase notification sent successfully:', response);
    //    } catch (e) { ... }

    return true;
  }
}

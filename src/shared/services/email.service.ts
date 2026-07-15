import nodemailer from "nodemailer";

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;
  private static isCreatingTestAccount = false;

  private static async getTransporter(): Promise<nodemailer.Transporter | null> {
    if (this.transporter) {
      return this.transporter;
    }

    // Si se configuran variables de entorno SMTP reales, las usamos
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        console.log("📨 SMTP Transporter configurado correctamente.");
        return this.transporter;
      } catch (err) {
        console.error("❌ Error al configurar SMTP real, reintentando con Ethereal...", err);
      }
    }

    // Fallback: Creamos una cuenta de Ethereal Mail para pruebas locales de forma asíncrona
    if (!this.isCreatingTestAccount) {
      this.isCreatingTestAccount = true;
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        console.log("📨 Buzón de pruebas temporal creado en Ethereal.");
        console.log(`🔗 Correo de Ethereal: ${testAccount.user}`);
      } catch (err) {
        console.error("❌ No se pudo conectar a Ethereal Mail. Los correos se imprimirán únicamente en consola.");
      } finally {
        this.isCreatingTestAccount = false;
      }
    }

    return this.transporter;
  }

  static async sendOtp(to: string, code: string): Promise<string | null> {
    const subject = "Tu código de verificación OTP - Delivery-GO";
    const text = `Tu código de verificación de inicio de sesión es: ${code}. Vence en 5 minutos.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #de2817; text-align: center;">Delivery-GO</h2>
        <h3 style="color: #333;">Código de Verificación de Inicio de Sesión</h3>
        <p>Hola,</p>
        <p>Has solicitado iniciar sesión en Delivery-GO. Por favor, usa el siguiente código único (OTP) para completar tu autenticación:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #de2817; background-color: #f7f7f7; padding: 10px 20px; border-radius: 5px; border: 1px dashed #de2817;">
            ${code}
          </span>
        </div>
        <p style="color: #666; font-size: 14px;">Este código expirará en <b>5 minutos</b> por razones de seguridad.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="color: #999; font-size: 12px; text-align: center;">Si no solicitaste este código, por favor ignora este correo.</p>
      </div>
    `;

    // Intentamos enviar usando el transporter
    try {
      const transporter = await this.getTransporter();
      if (transporter) {
        const from = process.env.SMTP_FROM || '"Delivery-GO" <no-reply@delivery-go.com>';
        const info = await transporter.sendMail({
          from,
          to,
          subject,
          text,
          html,
        });

        console.log(`📩 Correo OTP enviado con éxito a ${to}. MessageId: ${info.messageId}`);
        
        // Si usamos Ethereal, imprimimos la URL para ver el correo
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log(`🔗 Ver correo enviado en: ${previewUrl}`);
          return previewUrl;
        }
        return null;
      }
    } catch (error) {
      console.error(`❌ Error al enviar correo OTP a ${to}:`, error);
    }

    // Fallback definitivo en consola:
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🔑 [OTP DIRECT LINK / BACKUP] Correo: ${to} | Código: ${code}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    return null;
  }
}

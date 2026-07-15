import { IAuthRepository } from "../../domain/repositories/auth.repository";
import { prisma } from "../../../../shared/config/database";
import { EmailService } from "../../../../shared/services/email.service";
import { AuthError } from "./login.use-case";

export interface SendOtpDto {
  identifier: string; // email o teléfono
}

export class SendOtpUseCase {
  constructor(private authRepo: IAuthRepository) {}

  async execute(
    dto: SendOtpDto,
    meta: { ipAddress?: string; userAgent?: string }
  ): Promise<{ message: string; etherealUrl?: string }> {
    const user = await this.authRepo.findUserByEmail(dto.identifier);

    if (!user) {
      throw new AuthError("Usuario no encontrado", 404);
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // 1. Guardamos el nuevo OTP en la base de datos
    await prisma.loginOtp.create({
      data: {
        userId: user.id,
        code,
        expiresAt,
      },
    });

    // 2. Enviamos el correo con el código
    const etherealUrl = await EmailService.sendOtp(user.email, code);

    // 3. Log de auditoría
    await this.authRepo.createAuditLog({
      userId: user.id,
      action: "VERIFICATION",
      success: true,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return {
      message: "Código de verificación enviado exitosamente al correo registrado.",
      etherealUrl: etherealUrl || undefined,
    };
  }
}

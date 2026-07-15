import { AuthResponse } from "../dtos/auth.dto";
import { IAuthRepository } from "../../domain/repositories/auth.repository";
import { generateToken } from "../../../../shared/security/token.service";
import { prisma } from "../../../../shared/config/database";
import { AuthError } from "./login.use-case";

export interface VerifyOtpDto {
  identifier: string; // email o teléfono
  code: string;
}

export class VerifyOtpUseCase {
  constructor(private authRepo: IAuthRepository) {}

  async execute(
    dto: VerifyOtpDto,
    meta: { ipAddress?: string; userAgent?: string }
  ): Promise<AuthResponse> {
    const user = await this.authRepo.findUserByEmail(dto.identifier);

    if (!user) {
      throw new AuthError("Usuario no encontrado", 404);
    }

    // 1. Buscamos el código OTP más reciente y activo del usuario
    const otp = await prisma.loginOtp.findFirst({
      where: {
        userId: user.id,
        verifiedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!otp) {
      await this.authRepo.createAuditLog({
        userId: user.id,
        action: "VERIFICATION",
        success: false,
        failureReason: "TOKEN_EXPIRED",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new AuthError("El código de verificación ha expirado o es inexistente.", 400);
    }

    // 2. Comparamos el código ingresado con el guardado
    if (otp.code !== dto.code) {
      await this.authRepo.createAuditLog({
        userId: user.id,
        action: "VERIFICATION",
        success: false,
        failureReason: "INVALID_TOKEN",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new AuthError("Código de verificación incorrecto.", 400);
    }

    // 3. Marcamos el OTP como verificado
    await prisma.loginOtp.update({
      where: { id: otp.id },
      data: { verifiedAt: new Date() },
    });

    // 4. Generamos el token JWT definitivo para el usuario verificado
    const token = generateToken({
      userId: user.id,
      role: user.roles[0] ?? "CUSTOMER",
    });

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await this.authRepo.createSession({
      userId: user.id,
      token,
      ipAddress: meta.ipAddress,
      expiresAt,
    });

    await this.authRepo.createAuditLog({
      userId: user.id,
      action: "LOGIN",
      success: true,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        role: user.role,
        restaurantId: user.restaurantId,
        courierId: user.courierId,
      },
    };
  }
}

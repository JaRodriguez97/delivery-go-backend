import { LoginDto, AuthResponse } from "../dtos/auth.dto";
import { IAuthRepository } from "../../domain/repositories/auth.repository";
import { comparePassword } from "../../../../shared/security/hash.service";
import { generateToken } from "../../../../shared/security/token.service";

export class LoginUseCase {
  constructor(private authRepo: IAuthRepository) {}

  async execute(
    dto: LoginDto,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResponse> {
    const user = await this.authRepo.findUserByEmail(dto.email);

    if (!user) {
      await this.authRepo.createAuditLog({
        action: "LOGIN",
        success: false,
        failureReason: "USER_NOT_FOUND",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new AuthError("Credenciales inválidas", 401);
    }

    if (user.accountLocked) {
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        await this.authRepo.createAuditLog({
          userId: user.id,
          action: "LOGIN",
          success: false,
          failureReason: "ACCOUNT_LOCKED",
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });
        throw new AuthError("Cuenta bloqueada temporalmente", 423);
      }
    }

    if (user.status !== "ACTIVE") {
      await this.authRepo.createAuditLog({
        userId: user.id,
        action: "LOGIN",
        success: false,
        failureReason: "UNKNOWN",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      if (user.status === "PENDING") {
        throw new AuthError(
          "Tu cuenta está en proceso de verificación. Por favor aguarda la aprobación del administrador.",
          403,
          "ACCOUNT_PENDING",
        );
      }

      throw new AuthError(
        "Cuenta inactiva o suspendida",
        403,
        "ACCOUNT_INACTIVE",
      );
    }

    const passwordValid = await comparePassword(
      dto.password,
      user.passwordHash,
    );
    if (!passwordValid) {
      await this.authRepo.createAuditLog({
        userId: user.id,
        action: "LOGIN",
        success: false,
        failureReason: "INVALID_PASSWORD",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new AuthError("Credenciales inválidas", 401);
    }

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
      },
    };
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

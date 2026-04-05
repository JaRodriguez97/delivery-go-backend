import { IAuthRepository } from "../../domain/repositories/auth.repository";
import { AuthError } from "./login.use-case";

export class LogoutUseCase {
  constructor(private authRepo: IAuthRepository) {}

  async execute(
    token: string,
    meta: { userId: string; ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    await this.authRepo.revokeSession(token);

    await this.authRepo.createAuditLog({
      userId: meta.userId,
      action: "LOGOUT",
      success: true,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}

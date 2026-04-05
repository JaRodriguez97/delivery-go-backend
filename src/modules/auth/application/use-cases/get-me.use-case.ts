import { IAuthRepository } from "../../domain/repositories/auth.repository";
import { AuthError } from "./login.use-case";

export class GetMeUseCase {
  constructor(private authRepo: IAuthRepository) {}

  async execute(userId: string) {
    const user = await this.authRepo.findUserById(userId);

    if (!user) {
      throw new AuthError("Usuario no encontrado", 404);
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
    };
  }
}

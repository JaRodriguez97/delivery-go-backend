import { Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { verifyToken, TokenPayload } from "../security/token.service";
import { AuthenticatedRequest } from "../types/authenticated-request";

export function authenticationMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer")) {
    res.status(401).json({ error: "Token no proporcionado 2" });
    return;
  }

  const token = header.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Token no proporcionado 3" });
    return;
  }

  let payload: TokenPayload;
  try {
    payload = verifyToken(token);
  } catch {
    res.status(403).json({ error: "Token inválido o expirado" });
    return;
  }

  prisma.session
    .findFirst({
      where: {
        token,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
      select: { userId: true },
    })
    .then((session) => {
      if (!session) {
        res.status(401).json({ error: "Sesión inválida o expirada" });
        return;
      }

      if (session.userId !== payload.userId) {
        res.status(403).json({ error: "Token inválido" });
        return;
      }

      req.user = payload;
      next();
    })
    .catch((error) => next(error));
}

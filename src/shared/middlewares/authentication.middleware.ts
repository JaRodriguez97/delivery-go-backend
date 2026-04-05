import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../security/token.service";

export function authenticationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token no proporcionado" });
    return;
  }

  try {
    const token = header.split(" ")[1];
    const payload = verifyToken(token);
    (req as any).user = payload;
    next();
  } catch {
    res.status(403).json({ error: "Token inválido o expirado" });
  }
}

import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/authenticated-request";
import { Role } from "../security/roles";

export function authorizationMiddleware(...allowedRoles: Role[]) {
  const normalizedAllowedRoles = allowedRoles.map((role) => role.toUpperCase());

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    if (normalizedAllowedRoles.length === 0) {
      next();
      return;
    }

    const currentRole = String(user.role).toUpperCase();

    if (!normalizedAllowedRoles.includes(currentRole)) {
      res.status(403).json({ error: "No tienes permisos para esta acción" });
      return;
    }

    next();
  };
}

import { Request, Response, NextFunction } from "express";

export function authorizationMiddleware(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({ error: "No tienes permisos para esta acción" });
      return;
    }

    next();
  };
}

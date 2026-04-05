import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validate } from "../../../../shared/middlewares/validation.middleware";
import { authenticationMiddleware } from "../../../../shared/middlewares/authentication.middleware";
import { loginSchema } from "../../application/dtos/auth.dto";

const router = Router();

router.post("/login", validate(loginSchema), AuthController.login);
router.post("/logout", authenticationMiddleware, AuthController.logout);
router.get("/me", authenticationMiddleware, AuthController.me);

export const authRoutes = router;

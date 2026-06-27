import { Router } from "express";
import { UsersController } from "../controllers/users.controller";
import { authenticationMiddleware } from "../../../../shared/middlewares/authentication.middleware";
import { authorizationMiddleware } from "../../../../shared/middlewares/authorization.middleware";

const router = Router();

// Todas las rutas de usuarios requieren autenticación y rol ADMIN
router.use(authenticationMiddleware);
router.use(authorizationMiddleware("ADMIN"));

router.get("/", UsersController.list);
router.get("/:id", UsersController.getById);
router.post("/", UsersController.create);
router.put("/:id", UsersController.update);
router.delete("/:id", UsersController.remove);

export const usersRoutes = router;

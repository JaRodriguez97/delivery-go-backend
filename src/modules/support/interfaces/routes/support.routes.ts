import { Router } from "express";
import { SupportController } from "../controllers/support.controller";
import { authenticationMiddleware } from "../../../../shared/middlewares/authentication.middleware";
import { validate } from "../../../../shared/middlewares/validation.middleware";
import {
  createTicketSchema,
  closeTicketSchema,
  addCommentSchema,
} from "../../application/dtos/support.dto";

const router = Router();

router.use(authenticationMiddleware);

router.get("/", SupportController.list);
router.get("/:id", SupportController.getById);
router.post("/", validate(createTicketSchema), SupportController.create);
router.post("/:id/close", validate(closeTicketSchema), SupportController.close);
router.post(
  "/:id/comments",
  validate(addCommentSchema),
  SupportController.addComment,
);

export const supportRoutes = router;

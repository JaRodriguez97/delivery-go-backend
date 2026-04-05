import { z } from "zod/v4";

export const createTicketSchema = z.object({
  subject: z.string().min(1),
  description: z.string().min(1),
  orderId: z.string().uuid().optional(),
  category: z
    .enum(["technical", "billing", "account", "general", "fraud"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});

export const addCommentSchema = z.object({
  comment: z.string().min(1),
});

export const closeTicketSchema = z.object({
  resolution: z.string().min(1),
});

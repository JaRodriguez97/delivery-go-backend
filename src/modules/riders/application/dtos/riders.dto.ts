import { z } from "zod";

export const createRiderSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  vehicle: z
    .object({
      type: z.string().min(1),
      brand: z.string().optional(),
      model: z.string().optional(),
      plate: z.string().optional(),
      color: z.string().optional(),
    })
    .optional(),
});

export const updateRiderSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  status: z.string().optional(),
});

export type CreateRiderDto = z.infer<typeof createRiderSchema>;
export type UpdateRiderDto = z.infer<typeof updateRiderSchema>;

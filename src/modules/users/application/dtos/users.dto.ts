import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  documentType: z.enum(["CC", "CE", "PASSPORT", "TI", "NIT"]).optional().default("CC"),
  documentNumber: z.string().optional(),
  role: z.enum(["ADMIN", "RESTAURANT", "RIDER"]).default("RIDER"),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"]).optional(),
  role: z.enum(["ADMIN", "RESTAURANT", "RIDER"]).optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;

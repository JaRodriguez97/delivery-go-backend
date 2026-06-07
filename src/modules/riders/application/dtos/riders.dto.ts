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

export const registerRiderSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().min(8),
    email: z.string().email(),
    password: z.string().min(6),
    workZone: z.string().optional(),
    vehicleType: z.enum(["MOTORCYCLE", "BICYCLE"]),
    brand: z.string().min(1),
    model: z.string().min(1),
    plate: z.string().optional(),
    serialNumber: z.string().optional(),
    year: z.coerce.number().int().min(1990).max(2100),
    usesBicycle: z.coerce.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.usesBicycle && !value.serialNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El serial de la bicicleta es obligatorio",
        path: ["serialNumber"],
      });
    }

    if (!value.usesBicycle && !value.plate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La placa es obligatoria para motocicleta",
        path: ["plate"],
      });
    }
  });

export const reviewRiderSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  notes: z.string().optional(),
});

export type CreateRiderDto = z.infer<typeof createRiderSchema>;
export type UpdateRiderDto = z.infer<typeof updateRiderSchema>;
export type RegisterRiderDto = z.infer<typeof registerRiderSchema>;

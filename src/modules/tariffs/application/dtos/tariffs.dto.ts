import { z } from "zod/v4";

export const createTariffSchema = z.object({
  name: z.string().min(1),
  baseFee: z.number().min(0),
  perKmFee: z.number().min(0),
  currency: z.string().default("COP"),
  isActive: z.boolean().default(true),
});

export const updateTariffSchema = z.object({
  name: z.string().min(1).optional(),
  baseFee: z.number().min(0).optional(),
  perKmFee: z.number().min(0).optional(),
  currency: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const calculateFeeSchema = z.object({
  distance: z.coerce.number().min(0),
  restaurantId: z.string().uuid().optional(),
});

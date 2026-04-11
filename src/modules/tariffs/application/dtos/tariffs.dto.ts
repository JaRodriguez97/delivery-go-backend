import { z } from "zod/v4";

const roundingModeSchema = z.enum(["NONE", "HALF", "INTEGER"]);

export const createTariffSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  baseFee: z.number().min(0),
  perKmFee: z.number().min(0),
  minimumFee: z.number().min(0).optional(),
  maximumFee: z.number().min(0).optional(),
  minimumRadiusKm: z.number().min(0).default(1),
  autoRounding: roundingModeSchema.default("HALF"),
  dynamicPricingEnabled: z.boolean().default(true),
  currency: z.string().default("COP"),
  isActive: z.boolean().default(true),
});

export const updateTariffSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  baseFee: z.number().min(0).optional(),
  perKmFee: z.number().min(0).optional(),
  minimumFee: z.number().min(0).optional(),
  maximumFee: z.number().min(0).optional(),
  minimumRadiusKm: z.number().min(0).optional(),
  autoRounding: roundingModeSchema.optional(),
  dynamicPricingEnabled: z.boolean().optional(),
  currency: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const calculateFeeSchema = z.object({
  distance: z.coerce.number().min(0),
  restaurantId: z.string().uuid().optional(),
});

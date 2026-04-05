import { z } from "zod/v4";

export const processPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  paymentMethodId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().default("COP"),
  externalReference: z.string().optional(),
  notes: z.string().optional(),
});

export const refundPaymentSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().optional(),
});

import { z } from "zod/v4";

export const updateGeneralSettingsSchema = z.object({
  systemName: z.string().min(1).max(255).optional(),
  operationCity: z.string().min(1).max(150).optional(),
  timezone: z.string().min(1).max(100).optional(),
  language: z.string().min(1).max(10).optional(),
  currency: z.string().min(1).max(10).optional(),
  companyEmail: z.string().email().optional().or(z.literal("")),
  supportPhone: z.string().max(50).optional(),
});

export const updateFinancialSettingsSchema = z.object({
  platformCommissionPercent: z.coerce.number().min(0).max(100),
  fixedCommissionPerOrder: z.coerce.number().min(0),
  differentiatedCommissionByRestaurant: z.boolean().optional(),
  withholdRiderAutomatically: z.boolean().optional(),
  settlementMethod: z.enum(["AUTOMATIC", "MANUAL"]).optional(),
});

export const updateNotificationSettingsSchema = z.object({
  channels: z.array(
    z.object({
      code: z.string().min(1).max(50),
      isActive: z.boolean(),
    }),
  ),
});

export const createAdminSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(64),
});

export const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(8).max(64),
  newPassword: z.string().min(8).max(64),
});

export const resetAdminPasswordSchema = z.object({
  newPassword: z.string().min(8).max(64),
});

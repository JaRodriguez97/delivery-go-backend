import { z } from "zod/v4";

export const updateGeneralSettingsSchema = z.object({
  companyName: z.string().min(1).optional(),
  companyEmail: z.string().email().optional(),
  supportPhone: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  currency: z.string().optional(),
});

export const updateNotificationSettingsSchema = z.object({
  channels: z.array(
    z.object({
      id: z.string().uuid(),
      isActive: z.boolean(),
    }),
  ),
});

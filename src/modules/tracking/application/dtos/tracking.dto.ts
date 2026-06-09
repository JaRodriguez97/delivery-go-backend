import { z } from "zod";

export const updateMyLocationSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  speed: z.coerce.number().min(0).optional(),
  heading: z.coerce.number().min(0).max(360).optional(),
  recordedAt: z.coerce.date().optional(),
});

export type UpdateMyLocationDto = z.infer<typeof updateMyLocationSchema>;

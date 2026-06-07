import { z } from "zod";

export const createRestaurantSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
  licenseNumber: z.string().optional(),
  deliveryEnabled: z.union([z.boolean(), z.string()]).optional(),
  prepTimeMinutes: z.union([z.number(), z.string()]).optional(),
  cuisineTypes: z.union([z.array(z.string()), z.string()]).optional(),
  owner: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }),
});

export const updateRestaurantSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  statusId: z.string().uuid().optional(),
});

export const registerRestaurantSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(8),
  email: z.string().email(),
  password: z.string().min(6),
  restaurantName: z.string().min(1),
  address: z.string().min(3),
  neighborhood: z.string().optional(),
  licenseNumber: z.string().optional(),
  deliveryEnabled: z.union([z.boolean(), z.string()]).optional(),
  prepTimeMinutes: z.union([z.number(), z.string()]).optional(),
  cuisineTypes: z.union([z.array(z.string()), z.string()]).optional(),
  description: z.string().optional(),
});

export const reviewRestaurantSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  notes: z.string().optional(),
});

export type CreateRestaurantDto = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantDto = z.infer<typeof updateRestaurantSchema>;
export type RegisterRestaurantDto = z.infer<typeof registerRestaurantSchema>;
export type ReviewRestaurantDto = z.infer<typeof reviewRestaurantSchema>;

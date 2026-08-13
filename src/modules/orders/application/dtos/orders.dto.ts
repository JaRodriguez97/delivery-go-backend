import { z } from "zod";

export const createOrderSchema = z.object({
  restaurantId: z.uuid().optional(),
  customerId: z.uuid().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().min(5).optional(),
  customerNeighborhood: z.string().min(2).optional(),
  destinationLat: z.number().min(-90).max(90).optional(),
  destinationLon: z.number().min(-180).max(180).optional(),
  deliveryDistanceKm: z.number().min(0).optional(),
  paymentMethod: z.string().min(3).optional(),
  priorityId: z.string().uuid().optional(),
  deliveryFee: z.number().min(0).optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().int().min(1),
        unitPrice: z.number().min(0),
        note: z.string().optional(),
      }),
    )
    .optional()
    .default([]),
});

export const updateOrderSchema = z.object({
  statusId: z.string().uuid().optional(),
  priorityId: z.string().uuid().optional(),
  courierId: z.string().uuid().optional(),
});

export const orderFiltersSchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
export type UpdateOrderDto = z.infer<typeof updateOrderSchema>;

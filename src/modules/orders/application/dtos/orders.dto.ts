import { z } from "zod";

export const createOrderSchema = z.object({
  restaurantId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  priorityId: z.string().uuid().optional(),
  deliveryFee: z.number().min(0).optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().int().min(1),
        unitPrice: z.number().min(0),
        note: z.string().optional(),
      }),
    )
    .min(1),
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
